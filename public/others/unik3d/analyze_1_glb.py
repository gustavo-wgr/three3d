import os
import sys
from typing import Optional, Tuple


def _sizeof_mb(num_bytes: int) -> float:
    return num_bytes / (1024.0 * 1024.0)


def _try_load_with_trimesh(file_path: str):
    try:
        import numpy as np  # noqa: F401
        import trimesh

        loaded = trimesh.load(file_path, force='scene')
        all_points = []

        if isinstance(loaded, trimesh.Scene):
            for geom in loaded.geometry.values():
                if hasattr(geom, 'vertices') and len(geom.vertices) > 0:
                    all_points.append(geom.vertices)
        else:
            geom = loaded
            if hasattr(geom, 'vertices') and len(geom.vertices) > 0:
                all_points.append(geom.vertices)

        if not all_points:
            return None

        import numpy as np
        points = np.vstack([np.asarray(p) for p in all_points])
        if points.shape[1] > 3:
            points = points[:, :3]
        return points
    except Exception:
        return None


def _try_load_with_pygltflib(file_path: str):
    try:
        import numpy as np
        from pygltflib import GLTF2

        gltf = GLTF2().load(file_path)

        # Get the binary blob for GLB files; if None, try reading external buffers
        blob = None
        try:
            blob = gltf.binary_blob()
        except Exception:
            blob = None

        def component_nbytes(component_type: int) -> int:
            # glTF component types
            return {
                5120: 1,  # BYTE
                5121: 1,  # UNSIGNED_BYTE
                5122: 2,  # SHORT
                5123: 2,  # UNSIGNED_SHORT
                5125: 4,  # UNSIGNED_INT
                5126: 4,  # FLOAT
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
                # External buffer path
                buffer_uri = gltf.buffers[buf_idx].uri
                buffer_path = os.path.join(os.path.dirname(file_path), buffer_uri)
                with open(buffer_path, 'rb') as f:
                    raw = f.read()
            else:
                # Single embedded buffer
                raw = blob

            start = (bv.byteOffset or 0) + (accessor.byteOffset or 0)
            comp_nbytes = component_nbytes(accessor.componentType)
            comp_count = type_num_components(accessor.type)
            count = accessor.count
            total_bytes = comp_nbytes * comp_count * count
            slice_bytes = raw[start:start + total_bytes]

            # Map component type to numpy dtype (little-endian)
            dtype = {
                5120: "<i1",   # BYTE
                5121: "<u1",   # UNSIGNED_BYTE
                5122: "<i2",   # SHORT
                5123: "<u2",   # UNSIGNED_SHORT
                5125: "<u4",   # UNSIGNED_INT
                5126: "<f4",   # FLOAT
            }[accessor.componentType]

            arr = np.frombuffer(slice_bytes, dtype=dtype)
            if comp_count > 1:
                arr = arr.reshape((count, comp_count))
            return arr

        all_positions = []
        if gltf.meshes is None:
            return None

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
                    all_positions.append(pos[:, :3])

        if not all_positions:
            return None

        points = np.vstack(all_positions)
        return points
    except Exception:
        return None


def load_points(file_path: str):
    points = _try_load_with_trimesh(file_path)
    if points is not None:
        return points
    points = _try_load_with_pygltflib(file_path)
    if points is not None:
        return points
    raise RuntimeError("Failed to load points from GLB using trimesh and pygltflib.")


def compute_bbox_stats(points) -> Tuple[Tuple[float, float, float], Tuple[float, float, float], Tuple[float, float, float], float, float, Tuple[float, float, float]]:
    import numpy as np
    pmin = points.min(axis=0)
    pmax = points.max(axis=0)
    extent = pmax - pmin
    center = (pmin + pmax) * 0.5
    diagonal = float((extent ** 2).sum() ** 0.5)
    bbox_radius = diagonal * 0.5
    return tuple(pmin.tolist()), tuple(pmax.tolist()), tuple(extent.tolist()), diagonal, bbox_radius, tuple(center.tolist())


def analyze(file_path: str) -> Optional[int]:
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        return 1

    try:
        import numpy as np  # noqa: F401
    except Exception:
        print("This script requires numpy. Please install it with: pip install numpy")
        return 1

    file_bytes = os.path.getsize(file_path)
    file_mb = _sizeof_mb(file_bytes)

    try:
        points = load_points(file_path)
    except Exception as e:
        print(f"Failed to load points: {e}")
        print("Try installing dependencies: pip install trimesh pygltflib numpy")
        return 1

    num_points = int(points.shape[0])
    pmin, pmax, extent, diagonal, bbox_radius, center = compute_bbox_stats(points)

    # Output summary
    print("UniK3D Reconstruction (1.glb) — Basic Metrics")
    print(f"- File path: {file_path}")
    print(f"- File size: {file_mb:.2f} MB ({file_bytes} bytes)")
    print(f"- Points (sampling): {num_points:,}")
    print("- Spatial extent (axis-aligned bbox):")
    print(f"  • min (x,y,z): {pmin}")
    print(f"  • max (x,y,z): {pmax}")
    print(f"  • size (dx,dy,dz): {extent}")
    print(f"  • diagonal length: {diagonal:.6f}")
    print(f"  • bbox radius (0.5 * diagonal): {bbox_radius:.6f}")
    print(f"  • center: {center}")

    return 0


if __name__ == "__main__":
    # Default to analyzing '1.glb' in the current directory
    target = sys.argv[1] if len(sys.argv) > 1 else "1.glb"
    sys.exit(analyze(target) or 0)


