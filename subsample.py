# Subsample a GLB point cloud (rate=0.06) while PRESERVING colors from COLOR_0, then save as GLB.
# Compatible with older pygltflib (no AccessorType). No extra installs here.

import os, base64, numpy as np
from typing import Optional

from pygltflib import GLTF2, Buffer, BufferView, Accessor, Scene, Node, Mesh, Primitive

# -------- config --------
SRC_PATH = "public/unik3d/1.glb"      # change if needed
DST_PATH = "public/unik3d/1_subsampled.glb"
RATE     = 0.06
SEED     = None  # set to an int (e.g., 42) for deterministic subsampling
# ------------------------

if SEED is not None:
    np.random.seed(SEED)

# glTF component type IDs (per spec)
FLOAT          = 5126
UNSIGNED_BYTE  = 5121
BYTE           = 5120
UNSIGNED_SHORT = 5123
SHORT          = 5122
UNSIGNED_INT   = 5125

BYTES_PER_COMPONENT = {
    FLOAT: 4,
    UNSIGNED_BYTE: 1,
    BYTE: 1,
    SHORT: 2,
    UNSIGNED_SHORT: 2,
    UNSIGNED_INT: 4,
}

NUM_COMPONENTS = {
    "SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4
}

DTYPE_FOR_COMPONENT = {
    FLOAT: np.float32,
    UNSIGNED_BYTE: np.uint8,
    BYTE: np.int8,
    SHORT: np.int16,
    UNSIGNED_SHORT: np.uint16,
    UNSIGNED_INT: np.uint32,
}

def _get_buffer_data(gltf: GLTF2, buffer_index: int, src_dir: Optional[str]) -> bytes:
    """
    Returns raw bytes of a buffer. Works for embedded GLB and (basic) URI buffers.
    """
    buf = gltf.buffers[buffer_index]

    # Newer pygltflib: GLB populates byteData
    data = getattr(buf, "byteData", None)
    if isinstance(data, (bytes, bytearray)) and len(data) == buf.byteLength:
        return data

    # Try GLB binary blob (common case: 1 buffer in GLB)
    if hasattr(gltf, "binary_blob"):
        try:
            bb = gltf.binary_blob()
            if isinstance(bb, (bytes, bytearray)):
                return bb
        except Exception:
            pass

    # If buffer has a data URI
    if getattr(buf, "uri", None):
        uri = buf.uri
        if uri.startswith("data:"):
            # data:[<mediatype>][;base64],<data>
            comma = uri.find(",")
            meta, b64 = uri[:comma], uri[comma+1:]
            if ";base64" in meta:
                return base64.b64decode(b64)
            else:
                return b64.encode("utf-8")
        else:
            # external file
            if src_dir is None:
                raise RuntimeError("External buffer URI found but source directory is unknown.")
            path = os.path.join(src_dir, uri)
            with open(path, "rb") as f:
                return f.read()

    raise RuntimeError("Could not resolve buffer bytes (unexpected GLB/GLTF layout).")

def read_accessor(gltf: GLTF2, accessor_index: int, src_dir: Optional[str]) -> np.ndarray:
    acc: Accessor = gltf.accessors[accessor_index]
    bv: BufferView = gltf.bufferViews[acc.bufferView]
    raw = _get_buffer_data(gltf, bv.buffer, src_dir)

    comp_type = acc.componentType
    ncomp     = NUM_COMPONENTS[acc.type if isinstance(acc.type, str) else str(acc.type)]
    comp_size = BYTES_PER_COMPONENT[comp_type]
    dtype     = DTYPE_FOR_COMPONENT[comp_type]

    base   = (bv.byteOffset or 0) + (acc.byteOffset or 0)
    stride = bv.byteStride or (ncomp * comp_size)
    count  = acc.count

    # Tightly packed?
    if stride == ncomp * comp_size:
        start = base
        end   = base + count * stride
        arr   = np.frombuffer(raw[start:end], dtype=dtype, count=count * ncomp)
        out   = arr.reshape((count, ncomp))
    else:
        out = np.empty((count, ncomp), dtype=dtype)
        for i in range(count):
            s = base + i * stride
            e = s + ncomp * comp_size
            out[i] = np.frombuffer(raw[s:e], dtype=dtype, count=ncomp)

    # Normalize if flagged (e.g., colors as normalized integers)
    if getattr(acc, "normalized", False) and np.issubdtype(out.dtype, np.integer):
        info = np.iinfo(out.dtype)
        out  = out.astype(np.float32) / float(info.max)

    return out

def set_attr(prim: Primitive, key: str, value: int):
    """
    Safely set an attribute (POSITION, COLOR_0) on a Primitive across pygltflib versions.
    """
    attrs = getattr(prim, "attributes", None)
    # Attributes object with fields
    try:
        setattr(attrs, key, value)
        prim.attributes = attrs
        return
    except Exception:
        pass
    # Fallback to dict-like
    try:
        if attrs is None:
            attrs = {}
        attrs[key] = value
        prim.attributes = attrs
        return
    except Exception:
        pass
    raise RuntimeError("Could not set primitive attribute in this pygltflib version.")

def get_attr(prim: Primitive, key: str):
    attrs = getattr(prim, "attributes", None)
    if attrs is None:
        return None
    # object with fields
    try:
        return getattr(attrs, key)
    except Exception:
        pass
    # dict-like
    try:
        return attrs.get(key, None)
    except Exception:
        return None

# ---------- Load source ----------
src_dir = os.path.dirname(os.path.abspath(SRC_PATH))
gltf = GLTF2().load(SRC_PATH)

# Find first primitive with POSITION
def first_primitive_with_position(gltf: GLTF2):
    scene_index = gltf.scene if gltf.scene is not None else 0
    scene = gltf.scenes[scene_index]
    node_indices = list(scene.nodes or [])
    visited = set()
    while node_indices:
        ni = node_indices.pop(0)
        if ni in visited: 
            continue
        visited.add(ni)
        node = gltf.nodes[ni]
        if node.mesh is not None:
            mesh = gltf.meshes[node.mesh]
            for p_idx, prim in enumerate(mesh.primitives):
                pos_idx = get_attr(prim, "POSITION")
                if pos_idx is not None:
                    return ni, node.mesh, p_idx
        if node.children:
            node_indices.extend(node.children)
    raise RuntimeError("No mesh primitive with POSITION found.")

node_idx, mesh_idx, prim_idx = first_primitive_with_position(gltf)
mesh = gltf.meshes[mesh_idx]
prim = mesh.primitives[prim_idx]

# Read POSITION (required)
pos_acc_idx = get_attr(prim, "POSITION")
positions = read_accessor(gltf, pos_acc_idx, src_dir)
n_points = positions.shape[0]
if n_points == 0:
    raise RuntimeError("POSITION accessor has zero points.")

# Read COLOR_0 (optional; preserve if present)
color_acc_idx = get_attr(prim, "COLOR_0")
if color_acc_idx is not None:
    colors = read_accessor(gltf, color_acc_idx, src_dir).astype(np.float32, copy=False)
    if colors.shape[1] == 3:
        channels = 3
    elif colors.shape[1] == 4:
        channels = 4
    else:
        # unusual channel count; coerce to RGB(A)
        if colors.shape[1] < 3:
            # pad to 3
            pad = np.ones((colors.shape[0], 3), dtype=np.float32)
            pad[:, :colors.shape[1]] = colors
            colors = pad
            channels = 3
        else:
            channels = 4
            a = np.ones((colors.shape[0], 1), dtype=np.float32)
            colors = np.concatenate([colors[:, :3], a], axis=1)
else:
    # no colors -> default to white
    channels = 3
    colors = np.ones((n_points, 3), dtype=np.float32)

# ---------- Subsample ----------
keep = np.random.rand(n_points) < RATE
if not np.any(keep):
    keep[np.random.randint(0, n_points)] = True

sub_pos = positions[keep].astype(np.float32)
sub_col = colors[keep].astype(np.float32)
if sub_pos.shape[0] == 0:
    raise RuntimeError("No points after subsampling (unexpected).")

# ---------- Build output GLB ----------
out = GLTF2(
    scenes=[], nodes=[], meshes=[], buffers=[], bufferViews=[], accessors=[]
)

# Pack both arrays into ONE buffer (tightly packed)
data_bytes = bytearray()
# positions accessor
pos_offset = len(data_bytes)
data_bytes += sub_pos.tobytes(order="C")
pos_bv_index = len(out.bufferViews)
out.bufferViews.append(BufferView(buffer=0, byteOffset=pos_offset, byteLength=sub_pos.nbytes))
pos_acc = Accessor(
    bufferView=pos_bv_index, byteOffset=0, componentType=FLOAT,
    count=sub_pos.shape[0], type="VEC3",
    min=np.min(sub_pos, axis=0).astype(float).tolist(),
    max=np.max(sub_pos, axis=0).astype(float).tolist()
)
out.accessors.append(pos_acc)
pos_accessor_index = len(out.accessors) - 1

# colors accessor (write as FLOAT [0,1] for compatibility)
col_offset = len(data_bytes)
data_bytes += sub_col.tobytes(order="C")
col_bv_index = len(out.bufferViews)
out.bufferViews.append(BufferView(buffer=0, byteOffset=col_offset, byteLength=sub_col.nbytes))
col_type = "VEC3" if sub_col.shape[1] == 3 else "VEC4"
col_acc = Accessor(
    bufferView=col_bv_index, byteOffset=0, componentType=FLOAT,
    count=sub_col.shape[0], type=col_type
)
out.accessors.append(col_acc)
col_accessor_index = len(out.accessors) - 1

# final buffer
out.buffers.append(Buffer(byteLength=len(data_bytes)))
# attach raw bytes (works across pygltflib versions for GLB output)
setattr(out.buffers[0], "byteData", bytes(data_bytes))

# primitive: POINTS
prim_new = Primitive()
# set attributes safely
set_attr(prim_new, "POSITION", pos_accessor_index)
set_attr(prim_new, "COLOR_0", col_accessor_index)
prim_new.mode = 0  # 0 = POINTS

mesh_new = Mesh(primitives=[prim_new])
out.meshes.append(mesh_new)

node_new = Node(mesh=0, name="subsampled_pointcloud")
out.nodes.append(node_new)

scene_new = Scene(nodes=[0])
out.scenes.append(scene_new)
out.scene = 0

# save
os.makedirs(os.path.dirname(DST_PATH) or ".", exist_ok=True)
out.save_binary(DST_PATH)
print(f"Done. Subsampled GLB written to: {DST_PATH}  |  Points kept: {sub_pos.shape[0]}")