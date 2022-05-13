// perlin noise generator
// from https://gist.github.com/banksean/304522

const dot = (g: number[], x: number, y: number, z: number) => g[0] * x + g[1] * y + g[2] * z;
const mix = (a: number, b: number, t: number) => (1.0 - t) * a + t * b;
const fade = (t: number) => t * t * t * (t * (t * 6.0 - 15.0) + 10.0);

const seed = (seed: number) => {
    const grad3 = [
        [1, 1, 0],
        [-1, 1, 0],
        [1, -1, 0],
        [-1, -1, 0],
        [1, 0, 1],
        [-1, 0, 1],
        [1, 0, -1],
        [-1, 0, -1],
        [0, 1, 1],
        [0, -1, 1],
        [0, 1, -1],
        [0, -1, -1],
    ];

    const p = new Array(256).fill(null).map((_, i) =>
        Math.floor(
            256 *
                parseFloat(
                    "0." +
                        Math.sin(seed * 9999 * i)
                            .toString()
                            .substring(7)
                )
        )
    );

    // To remove the need for index wrapping, double the permutation table length
    const perm = [...p, ...p];
    return { grad3, perm };
};

const noise = ({ grad3, perm }, x: number, y: number, z: number) => {
    // Find unit grid cell containing point
    let X = Math.floor(x);
    let Y = Math.floor(y);
    let Z = Math.floor(z);

    // Get relative xyz coordinates of point within that cell
    x = x - X;
    y = y - Y;
    z = z - Z;

    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255;
    Y = Y & 255;
    Z = Z & 255;

    // Calculate a set of eight hashed gradient indices
    const gi000 = perm[X + perm[Y + perm[Z]]] % 12;
    const gi001 = perm[X + perm[Y + perm[Z + 1]]] % 12;
    const gi010 = perm[X + perm[Y + 1 + perm[Z]]] % 12;
    const gi011 = perm[X + perm[Y + 1 + perm[Z + 1]]] % 12;
    const gi100 = perm[X + 1 + perm[Y + perm[Z]]] % 12;
    const gi101 = perm[X + 1 + perm[Y + perm[Z + 1]]] % 12;
    const gi110 = perm[X + 1 + perm[Y + 1 + perm[Z]]] % 12;
    const gi111 = perm[X + 1 + perm[Y + 1 + perm[Z + 1]]] % 12;

    // The gradients of each corner are now:
    // g000 = grad3[gi000];
    // g001 = grad3[gi001];
    // g010 = grad3[gi010];
    // g011 = grad3[gi011];
    // g100 = grad3[gi100];
    // g101 = grad3[gi101];
    // g110 = grad3[gi110];
    // g111 = grad3[gi111];
    // Calculate noise contributions from each of the eight corners
    const n000 = dot(grad3[gi000], x, y, z);
    const n100 = dot(grad3[gi100], x - 1, y, z);
    const n010 = dot(grad3[gi010], x, y - 1, z);
    const n110 = dot(grad3[gi110], x - 1, y - 1, z);
    const n001 = dot(grad3[gi001], x, y, z - 1);
    const n101 = dot(grad3[gi101], x - 1, y, z - 1);
    const n011 = dot(grad3[gi011], x, y - 1, z - 1);
    const n111 = dot(grad3[gi111], x - 1, y - 1, z - 1);
    // Compute the fade curve value for each of x, y, z
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    // Interpolate along x the contributions from each of the corners
    const nx00 = mix(n000, n100, u);
    const nx01 = mix(n001, n101, u);
    const nx10 = mix(n010, n110, u);
    const nx11 = mix(n011, n111, u);
    // Interpolate the four results along y
    const nxy0 = mix(nx00, nx10, v);
    const nxy1 = mix(nx01, nx11, v);
    // Interpolate the two last results along z
    const nxyz = mix(nxy0, nxy1, w);

    return nxyz;
};

export { seed, dot, mix, fade, noise };
