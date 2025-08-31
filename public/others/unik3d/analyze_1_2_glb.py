import os
import sys
import gc
import logging
from typing import Dict, List, Optional, Tuple


def _sizeof_mb(num_bytes: int) -> float:
    return num_bytes / (1024.0 * 1024.0)


def _try_load_with_trimesh_min_max_count(file_path: str):
    try:
        import numpy as np  # noqa: F401
        import trimesh

        logging.getLogger('trimesh').setLevel(logging.ERROR)
        loaded = trimesh.load(file_path, force='scene')
        total_count = 0
        pmin = None
        pmax = None

        def update_min_max(vertices):
            nonlocal total_count, pmin, pmax
            if vertices is None or len(vertices) == 0:
                return
            total_count += int(vertices.shape[0])
            local_min = vertices.min(axis=0)
            local_max = vertices.max(axis=0)
            if pmin is None:
                pmin = local_min.astype(float)
                pmax = local_max.astype(float)
            else:
                pmin = np.minimum(pmin, local_min)
                pmax = np.maximum(pmax, local_max)

        if isinstance(loaded, trimesh.Scene):
            for geom in loaded.geometry.values():
                if hasattr(geom, 'vertices') and getattr(geom, 'vertices') is not None and len(geom.vertices) > 0:
                    update_min_max(geom.vertices[:, :3])
        else:
            geom = loaded
            if hasattr(geom, 'vertices') and getattr(geom, 'vertices') is not None and len(geom.vertices) > 0:
                update_min_max(geom.vertices[:, :3])

        if total_count == 0 or pmin is None or pmax is None:
            return None

        return int(total_count), tuple(pmin.tolist()), tuple(pmax.tolist())
    except Exception:
        return None


def _try_load_with_pygltflib_min_max_count(file_path: str):
    try:
        import numpy as np
        from pygltflib import GLTF2

        gltf = GLTF2().load(file_path)

        blob = None
        try:
            blob = gltf.binary_blob()
        except Exception:
            blob = None

        def component_nbytes(component_type: int) -> int:
            return {
                5120: 1,
                5121: 1,
                5122: 2,
                5123: 2,
                5125: 4,
                5126: 4,
            }[component_type]

        def type_num_components(type_str: str) -> int:
            return {
                "SCALAR": 1,
                "VEC2": 2,
                "VEC3": 3,
                "VEC4": 4,
                "MAT2": 4,
                "MAT3": 9,
                "MAT4": 16,
            }[type_str]

        def accessor_to_numpy(accessor_idx: int):
            accessor = gltf.accessors[accessor_idx]
            bv = gltf.bufferViews[accessor.bufferView]
            buf_idx = bv.buffer

            if blob is None:
                buffer_uri = gltf.buffers[buf_idx].uri
                buffer_path = os.path.join(os.path.dirname(file_path), buffer_uri)
                with open(buffer_path, 'rb') as f:
                    raw = f.read()
            else:
                raw = blob

            start = (bv.byteOffset or 0) + (accessor.byteOffset or 0)
            comp_nbytes = component_nbytes(accessor.componentType)
            comp_count = type_num_components(accessor.type)
            count = accessor.count
            total_bytes = comp_nbytes * comp_count * count
            slice_bytes = raw[start:start + total_bytes]

            dtype = {
                5120: "<i1",
                5121: "<u1",
                5122: "<i2",
                5123: "<u2",
                5125: "<u4",
                5126: "<f4",
            }[accessor.componentType]

            arr = np.frombuffer(slice_bytes, dtype=dtype)
            if comp_count > 1:
                arr = arr.reshape((count, comp_count))
            return arr

        if gltf.meshes is None:
            return None

        total_count = 0
        pmin = None
        pmax = None

        def update_min_max(arr3):
            nonlocal total_count, pmin, pmax
            if arr3 is None or arr3.size == 0:
                return
            total_count += int(arr3.shape[0])
            local_min = arr3.min(axis=0)
            local_max = arr3.max(axis=0)
            if pmin is None:
                pmin = local_min.astype(float)
                pmax = local_max.astype(float)
            else:
                pmin = np.minimum(pmin, local_min)
                pmax = np.maximum(pmax, local_max)

        for mesh in gltf.meshes:
            if mesh is None or mesh.primitives is None:
                continue
            for prim in mesh.primitives:
                attrs = getattr(prim, 'attributes', None)
                if attrs is None or getattr(attrs, 'POSITION', None) is None:
                    continue
                pos_idx = attrs.POSITION
                pos = accessor_to_numpy(pos_idx)
                if pos is not None and pos.shape[-1] >= 3:
                    update_min_max(pos[:, :3])

        if total_count == 0 or pmin is None or pmax is None:
            return None

        return int(total_count), tuple(pmin.tolist()), tuple(pmax.tolist())
    except Exception:
        return None


def load_min_max_count(file_path: str):
    result = _try_load_with_trimesh_min_max_count(file_path)
    if result is not None:
        return result
    result = _try_load_with_pygltflib_min_max_count(file_path)
    if result is not None:
        return result
    raise RuntimeError("Failed to load min/max/count from GLB using trimesh and pygltflib.")


def compute_bbox_stats(points) -> Tuple[Tuple[float, float, float], Tuple[float, float, float], Tuple[float, float, float], float, float, Tuple[float, float, float]]:
    import numpy as np
    pmin = points.min(axis=0)
    pmax = points.max(axis=0)
    extent = pmax - pmin
    center = (pmin + pmax) * 0.5
    diagonal = float((extent ** 2).sum() ** 0.5)
    bbox_radius = diagonal * 0.5
    return tuple(pmin.tolist()), tuple(pmax.tolist()), tuple(extent.tolist()), diagonal, bbox_radius, tuple(center.tolist())


def analyze_files(file_paths: List[str]) -> int:
    try:
        import numpy as np
    except Exception:
        print("This script requires numpy. Please install it with: pip install numpy")
        return 1

    results: List[Dict] = []

    for fp in file_paths:
        if not os.path.isfile(fp):
            print(f"File not found: {fp}")
            return 1

        file_bytes = os.path.getsize(fp)
        file_mb = _sizeof_mb(file_bytes)

        try:
            num_points, pmin_tuple, pmax_tuple = load_min_max_count(fp)
        except Exception as e:
            print(f"Failed to load points for {fp}: {e}")
            print("Try installing dependencies: pip install trimesh pygltflib numpy")
            return 1

        import numpy as np
        pmin_arr = np.asarray(pmin_tuple, dtype=float)
        pmax_arr = np.asarray(pmax_tuple, dtype=float)
        points_dummy = np.vstack([pmin_arr, pmax_arr])
        _, _, extent, diagonal, bbox_radius, center = compute_bbox_stats(points_dummy)

        results.append({
            'file_path': fp,
            'file_bytes': file_bytes,
            'file_mb': file_mb,
            'num_points': num_points,
            'pmin': pmin_tuple,
            'pmax': pmax_tuple,
            'extent': extent,
            'diagonal': diagonal,
            'bbox_radius': bbox_radius,
            'center': center,
        })

    # Per-file report
    print(f"UniK3D Reconstructions ({len(results)} files) — Per-file Metrics")
    for r in results:
        print(f"\nFile: {r['file_path']}")
        print(f"- File size: {r['file_mb']:.2f} MB ({r['file_bytes']} bytes)")
        print(f"- Points (sampling): {r['num_points']:,}")
        print("- Spatial extent (axis-aligned bbox):")
        print(f"  • min (x,y,z): {r['pmin']}")
        print(f"  • max (x,y,z): {r['pmax']}")
        print(f"  • size (dx,dy,dz): {r['extent']}")
        print(f"  • diagonal length: {r['diagonal']:.6f}")
        print(f"  • bbox radius (0.5 * diagonal): {r['bbox_radius']:.6f}")
        print(f"  • center: {r['center']}")

    # Aggregate statistics across files
    import numpy as np
    file_mbs = np.array([r['file_mb'] for r in results], dtype=float)
    num_points = np.array([r['num_points'] for r in results], dtype=float)
    diagonals = np.array([r['diagonal'] for r in results], dtype=float)
    radii = np.array([r['bbox_radius'] for r in results], dtype=float)
    extents = np.array([r['extent'] for r in results], dtype=float)  # shape (N, 3)

    def mean_sd(arr: np.ndarray) -> Tuple[float, float]:
        if arr.size == 0:
            return float('nan'), float('nan')
        if arr.size > 1:
            return float(arr.mean()), float(arr.std(ddof=1))
        return float(arr.mean()), float('nan')

    print("\nUniK3D Reconstructions — Aggregate Metrics")
    print(f"- Files analyzed: {', '.join([os.path.basename(r['file_path']) for r in results])}")

    m, s = mean_sd(file_mbs)
    print(f"- File size (MB): mean {m:.2f}, SD {s:.2f}; min {file_mbs.min():.2f}, max {file_mbs.max():.2f}")

    m, s = mean_sd(num_points / 1e6)
    print(f"- Points (millions): mean {m:.2f}, SD {s:.2f}; min {num_points.min()/1e6:.2f}, max {num_points.max()/1e6:.2f}")

    m, s = mean_sd(diagonals)
    print(f"- BBox diagonal: mean {m:.6f}, SD {s:.6f}; min {diagonals.min():.6f}, max {diagonals.max():.6f}")

    m, s = mean_sd(radii)
    print(f"- BBox radius: mean {m:.6f}, SD {s:.6f}; min {radii.min():.6f}, max {radii.max():.6f}")

    dx_m, dx_s = mean_sd(extents[:, 0])
    dy_m, dy_s = mean_sd(extents[:, 1])
    dz_m, dz_s = mean_sd(extents[:, 2])
    print(f"- Extent dx: mean {dx_m:.6f}, SD {dx_s:.6f}")
    print(f"- Extent dy: mean {dy_m:.6f}, SD {dy_s:.6f}")
    print(f"- Extent dz: mean {dz_m:.6f}, SD {dz_s:.6f}")

    # Encourage freeing memory promptly on large runs
    results.clear()
    gc.collect()
    return 0


if __name__ == "__main__":
    # Defaults to analyzing 1.glb through 20.glb in the current directory
    args = sys.argv[1:]
    if len(args) == 0:
        targets = [f"{i}.glb" for i in range(1, 21)]
    else:
        targets = args

    # Filter to existing files, warn on missing, but continue
    existing = []
    missing = []
    for t in targets:
        if os.path.isfile(t):
            existing.append(t)
        else:
            missing.append(t)
    if missing:
        print(f"Warning: missing files will be skipped: {', '.join(missing)}")
    if not existing:
        print("No valid .glb files found to analyze.")
        sys.exit(1)

    sys.exit(analyze_files(existing) or 0)


