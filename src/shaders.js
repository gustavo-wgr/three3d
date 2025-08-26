export const vertexShader = `
uniform float pointSize;
uniform float time;

varying vec3 vColor;

void main() {
    vColor = color.rgb;

    vec3 pos = position;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = pointSize * (1000.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = `
varying vec3 vColor;

void main() {
    float r = length(gl_PointCoord - vec2(0.5, 0.5));
    if (r > 0.5) discard;
    gl_FragColor = vec4(vColor, 1.0);
}
`;
