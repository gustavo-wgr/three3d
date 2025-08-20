export const vertexShader = `
// Vertex Shader with evaporation effect
uniform float pointSize;
uniform float time;
uniform float evaporationSpeed;
uniform float evaporationEnabled;
uniform float maxHeight;

attribute float evaporationFactor;

varying vec3 vColor;
varying float vOpacity;

void main() {
    // Pass the color to the fragment shader
    vColor = color.rgb;
    vOpacity = 1.0;

    // Start with regular position
    vec3 pos = position;
    float sizeCoef = 1.0;

    // Evaporation effect
    if (evaporationEnabled > 0.5 && evaporationFactor > 0.01) {
        sizeCoef = 1.5;
        float cycle = fract(time * evaporationFactor * evaporationSpeed);
        pos.y += cycle * maxHeight;
        vOpacity = 1.0 - cycle;
    }

    // Calculate point size with attenuation
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = pointSize * sizeCoef * (1000.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = `
varying vec3 vColor;
varying float vOpacity;

void main() {
    // Create a circular point
    float r = length(gl_PointCoord - vec2(0.5, 0.5));
    if (r > 0.5) discard;

    // Apply the color with opacity
    gl_FragColor = vec4(vColor, vOpacity);
}
`;
