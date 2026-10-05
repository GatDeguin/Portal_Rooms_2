struct SceneUniforms {
    uSample: vec4<f32>,
    uRes: vec4<f32>,
    uCube: vec4<f32>,
    uGravity: vec4<f32>,
    uTarget: vec4<f32>,
    uBoost: vec4<f32>,
    uCubeVelocity: vec4<f32>,
    uStickyStretch: vec4<f32>,
    uTime: vec4<f32>,
    uCubeY: vec4<f32>,
    uCubeFoot: vec4<f32>,
    uShake: vec4<f32>,
    uTargetY: vec4<f32>,
    uTargetType: vec4<f32>,
    uHold: vec4<f32>,
    uMotion: vec4<f32>,
    uCubeQ: vec4<f32>,
    uPulse: vec4<f32>,
    uTransition: vec4<f32>,
    uSurfaceContact: vec4<f32>,
    uLook: vec4<f32>,
    uObs0_: vec4<f32>,
    uObs1_: vec4<f32>,
    uObs2_: vec4<f32>,
    uObs3_: vec4<f32>,
    uObs4_: vec4<f32>,
    uObs5_: vec4<f32>,
    uZone0_: vec4<f32>,
    uZone1_: vec4<f32>,
    uZone2_: vec4<f32>,
    uZone3_: vec4<f32>,
    uZone4_: vec4<f32>,
    uZone5_: vec4<f32>,
    uZone6_: vec4<f32>,
    uZone7_: vec4<f32>,
    uZoneFlow0_: vec4<f32>,
    uZoneFlow1_: vec4<f32>,
    uZoneFlow2_: vec4<f32>,
    uZoneFlow3_: vec4<f32>,
    uZoneFlow4_: vec4<f32>,
    uZoneFlow5_: vec4<f32>,
    uZoneFlow6_: vec4<f32>,
    uZoneFlow7_: vec4<f32>,
    uZoneShape0_: vec4<f32>,
    uZoneShape1_: vec4<f32>,
    uZoneShape2_: vec4<f32>,
    uZoneShape3_: vec4<f32>,
    uZoneShape4_: vec4<f32>,
    uZoneShape5_: vec4<f32>,
    uZoneShape6_: vec4<f32>,
    uZoneShape7_: vec4<f32>,
    uZoneBasis0_: vec4<f32>,
    uZoneBasis1_: vec4<f32>,
    uZoneBasis2_: vec4<f32>,
    uZoneBasis3_: vec4<f32>,
    uZoneBasis4_: vec4<f32>,
    uZoneBasis5_: vec4<f32>,
    uZoneBasis6_: vec4<f32>,
    uZoneBasis7_: vec4<f32>,
    uZoneMotion0_: vec4<f32>,
    uZoneMotion1_: vec4<f32>,
    uZoneMotion2_: vec4<f32>,
    uZoneMotion3_: vec4<f32>,
    uZoneMotion4_: vec4<f32>,
    uZoneMotion5_: vec4<f32>,
    uZoneMotion6_: vec4<f32>,
    uZoneMotion7_: vec4<f32>,
    uRamp0_: vec4<f32>,
    uRamp1_: vec4<f32>,
    uRamp2_: vec4<f32>,
    uRampMeta0_: vec4<f32>,
    uRampMeta1_: vec4<f32>,
    uRampMeta2_: vec4<f32>,
    uPlat0_: vec4<f32>,
    uPlat1_: vec4<f32>,
    uPlat2_: vec4<f32>,
    uPlat3_: vec4<f32>,
    uPlatMeta0_: vec4<f32>,
    uPlatMeta1_: vec4<f32>,
    uPlatMeta2_: vec4<f32>,
    uPlatMeta3_: vec4<f32>,
    uBump0_: vec4<f32>,
    uBump1_: vec4<f32>,
    uBump2_: vec4<f32>,
    uBumpFx0_: vec4<f32>,
    uBumpFx1_: vec4<f32>,
    uBumpFx2_: vec4<f32>,
    uBumpWarp0_: vec4<f32>,
    uBumpWarp1_: vec4<f32>,
    uBumpWarp2_: vec4<f32>,
}

struct ReliefCandidate {
    material: f32,
    seed: f32,
    shape: f32,
    radius: f32,
    key: f32,
    origin: vec3<f32>,
    direction: vec3<f32>,
    extent: vec3<f32>,
    pigmentOffset: vec3<f32>,
    ramp: vec4<f32>,
    warp: vec4<f32>,
}

struct FragmentOutput {
    @location(0) fragColor: vec4<f32>,
}

const PI: f32 = 3.1415927f;

@group(0) @binding(0)
var<uniform> uniforms: SceneUniforms;
var<private> vUv_1: vec2<f32>;
var<private> fragColor: vec4<f32>;
@group(0) @binding(1)
var uReliefNoiseTexture: texture_2d<f32>;
@group(0) @binding(2)
var uReliefNoiseSampler: sampler;
@group(0) @binding(3)
var uSurfaceHitsTexture: texture_2d<f32>;
@group(0) @binding(4)
var uSurfaceHitsSampler: sampler;
var<private> gFootprint: f32 = 0.002f;
var<private> gReliefFootprint: f32 = 0.002f;
var<private> gRayCone: f32 = 0f;
var<private> gHitNormal: vec3<f32> = vec3(0f);
var<private> gHitNormalValid: bool = false;
var<private> gExcludedCandidates: vec3<f32> = vec3(0f);
var<private> gHitPoint: vec3<f32> = vec3(0f);
var<private> gHitCoordinates: vec3<f32> = vec3(0f);
var<private> gHitExtent: vec3<f32> = vec3(1f);
var<private> gHitMaterial: f32 = 0f;
var<private> gHitSeed: f32 = 0f;
var<private> gHitKey: f32 = 0f;
var<private> gForcedCandidate: f32 = 0f;
var<private> gl_FragCoord_1: vec4<f32>;

fn cubeScale() -> f32 {
    let _e187 = uniforms;
    return max(_e187.uTransition.x, 0.001f);
}

fn cubeCenter() -> vec3<f32> {
    let _e187 = uniforms;
    let _e192 = uniforms;
    let _e196 = uniforms;
    let _e200 = uniforms;
    return vec3<f32>(_e187.uCube.x, ((0.255f + _e192.uCubeY.x) + _e196.uTransition.y), _e200.uCube.y);
}

fn effectTime() -> f32 {
    let _e201 = uniforms;
    let _e204 = uniforms;
    let _e208 = uniforms;
    return ((_e201.uTime.x + _e204.uTransition.w) * _e208.uLook.w);
}

fn hash(p: vec2<f32>) -> f32 {
    var p_1: vec2<f32>;

    p_1 = p;
    let _e203 = p_1;
    const _e205 = vec2(251f);
    p_1 = (_e203 - (floor((_e203 / _e205)) * _e205));
    let _e211 = p_1;
    let _e215 = p_1;
    let _e222 = p_1;
    let _e226 = p_1;
    return fract(((17f * fract(((_e211.x * 0.1031f) + (_e215.y * 0.11369f)))) * fract(((_e222.y * 0.13787f) + (_e226.x * 0.09987f)))));
}

fn noise(p_2: vec2<f32>) -> f32 {
    var p_3: vec2<f32>;
    var i: vec2<f32>;
    var f: vec2<f32>;
    var u: vec2<f32>;

    p_3 = p_2;
    let _e203 = p_3;
    i = floor(_e203);
    let _e206 = p_3;
    f = fract(_e206);
    let _e209 = f;
    let _e210 = f;
    let _e212 = f;
    let _e214 = f;
    let _e215 = f;
    u = (((_e209 * _e210) * _e212) * ((_e214 * ((_e215 * 6f) - vec2(15f))) + vec2(10f)));
    let _e227 = i;
    let _e228 = hash(_e227);
    let _e229 = i;
    let _e236 = hash((_e229 + vec2<f32>(1f, 0f)));
    let _e237 = u;
    let _e240 = i;
    let _e247 = hash((_e240 + vec2<f32>(0f, 1f)));
    let _e248 = i;
    let _e255 = hash((_e248 + vec2<f32>(1f, 1f)));
    let _e256 = u;
    let _e259 = u;
    return mix(mix(_e228, _e236, _e237.x), mix(_e247, _e255, _e256.x), _e259.y);
}

fn detailWeight(frequency: f32) -> f32 {
    var frequency_1: f32;

    frequency_1 = frequency;
    let _e206 = gFootprint;
    let _e207 = frequency_1;
    return (1f - smoothstep(0.16f, 0.65f, (_e206 * _e207)));
}

fn filteredNoise(p_4: vec2<f32>, frequency_2: f32) -> f32 {
    var p_5: vec2<f32>;
    var frequency_3: f32;

    p_5 = p_4;
    frequency_3 = frequency_2;
    let _e206 = p_5;
    let _e207 = noise(_e206);
    let _e208 = frequency_3;
    let _e209 = detailWeight(_e208);
    return mix(0.5f, _e207, _e209);
}

fn fbm(p_6: vec2<f32>, frequency_4: f32) -> f32 {
    var p_7: vec2<f32>;
    var frequency_5: f32;
    var v: f32 = 0f;
    var a: f32 = 0.5f;
    var i_1: i32 = 0i;
    var w: f32;

    p_7 = p_6;
    frequency_5 = frequency_4;
    loop {
        let _e211 = i_1;
        if !((_e211 < 4i)) {
            break;
        }
        {
            let _e218 = frequency_5;
            let _e219 = detailWeight(_e218);
            w = _e219;
            let _e221 = v;
            let _e222 = a;
            let _e224 = p_7;
            let _e225 = noise(_e224);
            let _e226 = w;
            v = (_e221 + (_e222 * mix(0.5f, _e225, _e226)));
            let _e238 = p_7;
            p_7 = (((mat2x2<f32>(vec2<f32>(0.8f, -0.6f), vec2<f32>(0.6f, 0.8f)) * _e238) * 2.03f) + vec2<f32>(3.7f, 1.9f));
            let _e246 = frequency_5;
            frequency_5 = (_e246 * 2.03f);
            let _e249 = a;
            a = (_e249 * 0.5f);
        }
        continuing {
            let _e215 = i_1;
            i_1 = (_e215 + 1i);
        }
    }
    let _e252 = v;
    return _e252;
}

fn aaLine(distanceToLine: f32, halfWidth: f32) -> f32 {
    var distanceToLine_1: f32;
    var halfWidth_1: f32;
    var w_1: f32;

    distanceToLine_1 = distanceToLine;
    halfWidth_1 = halfWidth;
    let _e205 = gFootprint;
    w_1 = max(_e205, 0.0005f);
    let _e210 = halfWidth_1;
    let _e211 = w_1;
    let _e213 = halfWidth_1;
    let _e214 = w_1;
    let _e216 = distanceToLine_1;
    return (1f - smoothstep((_e210 - _e211), (_e213 + _e214), _e216));
}

fn includeCandidate(key: f32) -> bool {
    var key_1: f32;

    key_1 = key;
    return true;
}

fn includeSceneCandidate(key_2: f32) -> bool {
    var key_3: f32;

    key_3 = key_2;
    let _e203 = key_3;
    let _e204 = includeCandidate(_e203);
    return _e204;
}

fn qrot(q: vec4<f32>, v_1: vec3<f32>) -> vec3<f32> {
    var q_1: vec4<f32>;
    var v_2: vec3<f32>;

    q_1 = q;
    v_2 = v_1;
    let _e205 = v_2;
    let _e207 = q_1;
    let _e209 = q_1;
    let _e211 = v_2;
    let _e213 = q_1;
    let _e215 = v_2;
    return (_e205 + (2f * cross(_e207.xyz, (cross(_e209.xyz, _e211) + (_e213.w * _e215)))));
}

fn sdBox(p_8: vec3<f32>, b: vec3<f32>) -> f32 {
    var p_9: vec3<f32>;
    var b_1: vec3<f32>;
    var q_2: vec3<f32>;

    p_9 = p_8;
    b_1 = b;
    let _e205 = p_9;
    let _e207 = b_1;
    q_2 = (abs(_e205) - _e207);
    let _e210 = q_2;
    let _e215 = q_2;
    let _e217 = q_2;
    let _e219 = q_2;
    return (length(max(_e210, vec3(0f))) + min(max(_e215.x, max(_e217.y, _e219.z)), 0f));
}

fn sdRoundBox(p_10: vec3<f32>, b_2: vec3<f32>, r: f32) -> f32 {
    var p_11: vec3<f32>;
    var b_3: vec3<f32>;
    var r_1: f32;
    var q_3: vec3<f32>;

    p_11 = p_10;
    b_3 = b_2;
    r_1 = r;
    let _e207 = p_11;
    let _e209 = b_3;
    let _e211 = r_1;
    q_3 = ((abs(_e207) - _e209) + vec3(_e211));
    let _e215 = q_3;
    let _e220 = q_3;
    let _e222 = q_3;
    let _e224 = q_3;
    let _e231 = r_1;
    return ((length(max(_e215, vec3(0f))) + min(max(_e220.x, max(_e222.y, _e224.z)), 0f)) - _e231);
}

fn sdCyl(p_12: vec3<f32>, r_2: f32, h: f32) -> f32 {
    var p_13: vec3<f32>;
    var r_3: f32;
    var h_1: f32;
    var d: vec2<f32>;

    p_13 = p_12;
    r_3 = r_2;
    h_1 = h;
    let _e207 = p_13;
    let _e210 = p_13;
    let _e214 = r_3;
    let _e215 = h_1;
    d = (abs(vec2<f32>(length(_e207.xz), _e210.y)) - vec2<f32>(_e214, _e215));
    let _e219 = d;
    let _e221 = d;
    let _e226 = d;
    return (min(max(_e219.x, _e221.y), 0f) + length(max(_e226, vec2(0f))));
}

fn sdRing(p_14: vec3<f32>) -> f32 {
    var p_15: vec3<f32>;
    var q_4: vec2<f32>;

    p_15 = p_14;
    let _e203 = p_15;
    let _e211 = p_15;
    q_4 = vec2<f32>((abs((length(_e203.xz) - 0.45f)) - 0.065f), (abs(_e211.y) - 0.018f));
    let _e218 = q_4;
    let _e220 = q_4;
    let _e225 = q_4;
    return (min(max(_e218.x, _e220.y), 0f) + length(max(_e225, vec2(0f))));
}

fn opU(a_1: vec2<f32>, b_4: vec2<f32>) -> vec2<f32> {
    var a_2: vec2<f32>;
    var b_5: vec2<f32>;
    var local: vec2<f32>;

    a_2 = a_1;
    b_5 = b_4;
    let _e205 = b_5;
    let _e207 = a_2;
    if (_e205.x < _e207.x) {
        let _e210 = b_5;
        local = _e210;
    } else {
        let _e211 = a_2;
        local = _e211;
    }
    let _e213 = local;
    return _e213;
}

fn obstacle(p_16: vec3<f32>, o: vec4<f32>) -> vec2<f32> {
    var p_17: vec3<f32>;
    var o_1: vec4<f32>;

    p_17 = p_16;
    o_1 = o;
    let _e205 = o_1;
    if (_e205.z <= 0.001f) {
        return vec2<f32>(100f, 0f);
    }
    let _e214 = p_17;
    let _e215 = o_1;
    let _e218 = o_1;
    let _e222 = o_1;
    let _e227 = o_1;
    let _e233 = sdRoundBox((_e214 - vec3<f32>(_e215.x, 0.245f, _e218.y)), vec3<f32>((_e222.z * 0.5f), 0.245f, (_e227.w * 0.5f)), 0.045f);
    return vec2<f32>(_e233, 8f);
}

fn zoneDimensions(z: vec4<f32>, shape: vec4<f32>) -> vec3<f32> {
    var z_1: vec4<f32>;
    var shape_1: vec4<f32>;

    z_1 = z;
    shape_1 = shape;
    let _e205 = shape_1;
    let _e207 = z_1;
    let _e212 = shape_1;
    return (_e205.xyz + (vec3(_e207.z) * (1f - step(0.0001f, _e212.x))));
}

fn zoneRotation(basis: vec4<f32>) -> vec2<f32> {
    var basis_1: vec4<f32>;

    basis_1 = basis;
    let _e203 = basis_1;
    let _e212 = basis_1;
    let _e214 = basis_1;
    return (_e203.xy + (vec2<f32>(1f, 0f) * (1f - step(0.5f, dot(_e212.xy, _e214.xy)))));
}

fn zoneLocal(p_18: vec2<f32>, basis_2: vec2<f32>) -> vec2<f32> {
    var p_19: vec2<f32>;
    var basis_3: vec2<f32>;

    p_19 = p_18;
    basis_3 = basis_2;
    let _e205 = p_19;
    let _e206 = basis_3;
    let _e208 = p_19;
    let _e209 = basis_3;
    let _e212 = basis_3;
    return vec2<f32>(dot(_e205, _e206), dot(_e208, vec2<f32>(-(_e209.y), _e212.x)));
}

fn sdZoneFootprint(p_20: vec2<f32>, shape_2: vec3<f32>) -> f32 {
    var p_21: vec2<f32>;
    var shape_3: vec3<f32>;
    var d_1: vec2<f32>;

    p_21 = p_20;
    shape_3 = shape_2;
    let _e205 = p_21;
    let _e207 = shape_3;
    let _e210 = shape_3;
    d_1 = ((abs(_e205) - _e207.xy) + vec2(_e210.z));
    let _e215 = d_1;
    let _e220 = d_1;
    let _e222 = d_1;
    let _e228 = shape_3;
    return ((length(max(_e215, vec2(0f))) + min(max(_e220.x, _e222.y), 0f)) - _e228.z);
}

fn zonePlate(p_22: vec3<f32>, shape_4: vec3<f32>, basis_4: vec2<f32>) -> f32 {
    var p_23: vec3<f32>;
    var shape_5: vec3<f32>;
    var basis_5: vec2<f32>;
    var d_2: vec2<f32>;

    p_23 = p_22;
    shape_5 = shape_4;
    basis_5 = basis_4;
    let _e207 = p_23;
    let _e209 = basis_5;
    let _e210 = zoneLocal(_e207.xz, _e209);
    let _e211 = shape_5;
    let _e212 = sdZoneFootprint(_e210, _e211);
    let _e213 = p_23;
    d_2 = vec2<f32>(_e212, (abs(_e213.y) - 0.012f));
    let _e220 = d_2;
    let _e222 = d_2;
    let _e227 = d_2;
    return (min(max(_e220.x, _e222.y), 0f) + length(max(_e227, vec2(0f))));
}

fn jumpCap(p_24: vec3<f32>, footprintRadius: f32, motion: vec4<f32>) -> f32 {
    var p_25: vec3<f32>;
    var footprintRadius_1: f32;
    var motion_1: vec4<f32>;
    var legacy: f32;
    var radius: f32;
    var centre: f32;

    p_25 = p_24;
    footprintRadius_1 = footprintRadius;
    motion_1 = motion;
    let _e209 = motion_1;
    legacy = (1f - step(0.001f, _e209.z));
    let _e214 = motion_1;
    let _e216 = legacy;
    let _e217 = footprintRadius_1;
    let _e218 = footprintRadius_1;
    radius = (_e214.z + (_e216 * (((_e217 * _e218) / 0.28f) + 0.07f)));
    let _e227 = motion_1;
    let _e229 = legacy;
    let _e231 = radius;
    centre = (_e227.w + (_e229 * (0.152f - _e231)));
    let _e236 = p_25;
    let _e238 = p_25;
    let _e242 = centre;
    let _e244 = p_25;
    let _e248 = radius;
    let _e250 = centre;
    let _e251 = radius;
    let _e255 = motion_1;
    let _e262 = p_25;
    return max((length(vec3<f32>(_e236.x, ((_e238.y + 0.016f) - _e242), _e244.z)) - _e248), ((((_e250 + _e251) - (0.14f * (1f - _e255.x))) - 0.016f) - _e262.y));
}

fn zoneBase(motion_2: vec4<f32>, type_45: f32) -> f32 {
    var motion_3: vec4<f32>;
    var type_46: f32;
    var local_1: f32;

    motion_3 = motion_2;
    type_46 = type_45;
    let _e205 = type_46;
    let _e208 = motion_3;
    if ((_e205 > 4.5f) && (_e208.z > 0.001f)) {
        let _e213 = motion_3;
        let _e215 = motion_3;
        let _e220 = motion_3;
        local_1 = (((_e213.w + _e215.z) - (0.14f * (1f - _e220.x))) - 0.012f);
    } else {
        local_1 = 0f;
    }
    let _e229 = local_1;
    return _e229;
}

fn zoneObj(p_26: vec3<f32>, z_2: vec4<f32>, shape_6: vec4<f32>, basis_6: vec4<f32>, motion_4: vec4<f32>) -> vec2<f32> {
    var p_27: vec3<f32>;
    var z_3: vec4<f32>;
    var shape_7: vec4<f32>;
    var basis_7: vec4<f32>;
    var motion_5: vec4<f32>;
    var local_2: vec3<f32>;
    var size: vec3<f32>;
    var local_3: f32;
    var d_3: f32;

    p_27 = p_26;
    z_3 = z_2;
    shape_7 = shape_6;
    basis_7 = basis_6;
    motion_5 = motion_4;
    let _e211 = z_3;
    if (_e211.w < 0.5f) {
        return vec2<f32>(100f, 0f);
    }
    let _e220 = p_27;
    let _e221 = z_3;
    let _e224 = z_3;
    local_2 = (_e220 - vec3<f32>(_e221.x, 0.016f, _e224.y));
    let _e229 = z_3;
    let _e230 = shape_7;
    let _e231 = zoneDimensions(_e229, _e230);
    size = _e231;
    let _e233 = z_3;
    if (_e233.w > 4.5f) {
        let _e237 = local_2;
        let _e238 = size;
        let _e240 = motion_5;
        let _e241 = jumpCap(_e237, _e238.x, _e240);
        local_3 = _e241;
    } else {
        let _e242 = local_2;
        let _e243 = size;
        let _e244 = basis_7;
        let _e245 = zoneRotation(_e244);
        let _e246 = zonePlate(_e242, _e243, _e245);
        local_3 = _e246;
    }
    let _e248 = local_3;
    d_3 = _e248;
    let _e250 = d_3;
    let _e252 = z_3;
    return vec2<f32>(_e250, (15f + _e252.w));
}

fn jellyDistance(p_28: vec3<f32>, extent: vec3<f32>, compression: f32, warp: vec4<f32>) -> f32 {
    var p_29: vec3<f32>;
    var extent_1: vec3<f32>;
    var compression_1: f32;
    var warp_1: vec4<f32>;
    var local_4: vec3<f32>;

    p_29 = p_28;
    extent_1 = extent;
    compression_1 = compression;
    warp_1 = warp;
    let _e209 = p_29;
    let _e210 = p_29;
    let _e212 = warp_1;
    let _e215 = p_29;
    let _e217 = warp_1;
    let _e221 = p_29;
    let _e223 = extent_1;
    let _e226 = warp_1;
    let _e229 = p_29;
    let _e231 = warp_1;
    let _e234 = p_29;
    let _e236 = warp_1;
    local_4 = (_e209 + vec3<f32>(((_e210.x * _e212.x) + (_e215.z * _e217.y)), ((_e221.y + _e223.y) * _e226.w), ((_e229.x * _e231.y) + (_e234.z * _e236.z))));
    let _e243 = local_4;
    let _e244 = extent_1;
    let _e246 = extent_1;
    let _e248 = sdCyl(_e243, _e244.x, _e246.y);
    let _e250 = compression_1;
    let _e255 = compression_1;
    return (_e248 * min((1f - (_e250 * 0.8f)), (1f + (_e255 * 0.5f))));
}

fn bumperObj(p_30: vec3<f32>, b_6: vec4<f32>, fx: vec4<f32>, warp_2: vec4<f32>) -> vec2<f32> {
    var p_31: vec3<f32>;
    var b_7: vec4<f32>;
    var fx_1: vec4<f32>;
    var warp_3: vec4<f32>;
    var h_2: f32;

    p_31 = p_30;
    b_7 = b_6;
    fx_1 = fx;
    warp_3 = warp_2;
    let _e209 = b_7;
    if (_e209.z < 0.01f) {
        return vec2<f32>(100f, 0f);
    }
    let _e218 = b_7;
    h_2 = max(_e218.w, 0.34f);
    let _e223 = p_31;
    let _e224 = b_7;
    let _e226 = h_2;
    let _e229 = b_7;
    let _e233 = b_7;
    let _e235 = h_2;
    let _e238 = b_7;
    let _e241 = fx_1;
    let _e243 = warp_3;
    let _e244 = jellyDistance((_e223 - vec3<f32>(_e224.x, (_e226 * 0.5f), _e229.y)), vec3<f32>(_e233.z, (_e235 * 0.5f), _e238.z), _e241.x, _e243);
    return vec2<f32>(_e244, 22f);
}

fn rampHeight(xz: vec2<f32>, r_4: vec4<f32>, meta_: vec4<f32>) -> f32 {
    var xz_1: vec2<f32>;
    var r_5: vec4<f32>;
    var meta_1: vec4<f32>;
    var local_5: vec2<f32>;
    var dir: vec2<f32>;
    var span: f32;
    var along: f32;

    xz_1 = xz;
    r_5 = r_4;
    meta_1 = meta_;
    let _e207 = meta_1;
    if (length(_e207.yz) < 0.00001f) {
        local_5 = vec2<f32>(0f, -1f);
    } else {
        let _e218 = meta_1;
        local_5 = normalize(_e218.yz);
    }
    let _e222 = local_5;
    dir = _e222;
    let _e224 = dir;
    let _e227 = r_5;
    let _e230 = dir;
    let _e233 = r_5;
    span = max(((abs(_e224.x) * _e227.z) + (abs(_e230.y) * _e233.w)), 0.00001f);
    let _e240 = xz_1;
    let _e241 = r_5;
    let _e244 = dir;
    let _e246 = span;
    along = clamp(((dot((_e240 - _e241.xy), _e244) / _e246) + 0.5f), 0f, 1f);
    let _e254 = meta_1;
    let _e256 = along;
    let _e257 = meta_1;
    let _e259 = meta_1;
    return (_e254.w + (_e256 * (_e257.x - _e259.w)));
}

fn rampObj(p_32: vec3<f32>, r_6: vec4<f32>, meta_2: vec4<f32>) -> vec2<f32> {
    var p_33: vec3<f32>;
    var r_7: vec4<f32>;
    var meta_3: vec4<f32>;
    var h_3: f32;
    var d_4: vec2<f32>;
    var local_6: vec2<f32>;
    var dir_1: vec2<f32>;
    var slope: f32;

    p_33 = p_32;
    r_7 = r_6;
    meta_3 = meta_2;
    let _e207 = r_7;
    if (_e207.z <= 0.001f) {
        return vec2<f32>(100f, 0f);
    }
    let _e216 = p_33;
    let _e218 = r_7;
    let _e219 = meta_3;
    let _e220 = rampHeight(_e216.xz, _e218, _e219);
    h_3 = _e220;
    let _e222 = p_33;
    let _e224 = r_7;
    let _e228 = r_7;
    d_4 = (abs((_e222.xz - _e224.xy)) - (_e228.zw * 0.5f));
    let _e234 = meta_3;
    if (length(_e234.yz) < 0.00001f) {
        local_6 = vec2<f32>(0f, -1f);
    } else {
        let _e245 = meta_3;
        local_6 = normalize(_e245.yz);
    }
    let _e249 = local_6;
    dir_1 = _e249;
    let _e251 = meta_3;
    let _e253 = meta_3;
    let _e256 = dir_1;
    let _e259 = r_7;
    let _e262 = dir_1;
    let _e265 = r_7;
    slope = ((_e251.x - _e253.w) / max(((abs(_e256.x) * _e259.z) + (abs(_e262.y) * _e265.w)), 0.001f));
    let _e273 = d_4;
    let _e275 = d_4;
    let _e278 = p_33;
    let _e280 = h_3;
    let _e283 = slope;
    let _e284 = slope;
    let _e290 = meta_3;
    let _e292 = p_33;
    return vec2<f32>(max(max(max(_e273.x, _e275.y), ((_e278.y - _e280) / sqrt((1f + (_e283 * _e284))))), ((_e290.w - _e292.y) - 0.025f)), 19f);
}

fn platformObj(p_34: vec3<f32>, r_8: vec4<f32>, meta_4: vec4<f32>) -> vec2<f32> {
    var p_35: vec3<f32>;
    var r_9: vec4<f32>;
    var meta_5: vec4<f32>;
    var h_4: f32;

    p_35 = p_34;
    r_9 = r_8;
    meta_5 = meta_4;
    let _e207 = r_9;
    if (_e207.z <= 0.001f) {
        return vec2<f32>(100f, 0f);
    }
    let _e216 = meta_5;
    h_4 = max(_e216.x, 0.03f);
    let _e221 = p_35;
    let _e222 = r_9;
    let _e224 = h_4;
    let _e227 = r_9;
    let _e231 = r_9;
    let _e235 = h_4;
    let _e238 = r_9;
    let _e244 = sdRoundBox((_e221 - vec3<f32>(_e222.x, (_e224 * 0.5f), _e227.y)), vec3<f32>((_e231.z * 0.5f), (_e235 * 0.5f), (_e238.w * 0.5f)), 0.018f);
    return vec2<f32>(_e244, 19f);
}

fn mapScene(p_36: vec3<f32>) -> vec2<f32> {
    var p_37: vec3<f32>;
    var r_10: vec2<f32> = vec2<f32>(100f, 0f);
    var tp: vec3<f32>;
    var local_7: f32;
    var d_5: f32;
    var iq: vec4<f32>;
    var cp: vec3<f32>;

    p_37 = p_36;
    let _e210 = includeSceneCandidate(100f);
    if _e210 {
        let _e211 = r_10;
        let _e212 = p_37;
        let _e225 = sdBox((_e212 - vec3<f32>(0f, -0.055f, 0f)), vec3<f32>(3.25f, 0.055f, 3.25f));
        let _e228 = opU(_e211, vec2<f32>(_e225, 1f));
        r_10 = _e228;
    }
    let _e230 = includeSceneCandidate(200f);
    if _e230 {
        let _e231 = r_10;
        let _e232 = p_37;
        let _e244 = sdRoundBox((_e232 - vec3<f32>(0f, 0.005f, 0.78f)), vec3<f32>(2.08f, 0.005f, 1.27f), 0.004f);
        let _e247 = opU(_e231, vec2<f32>(_e244, 2f));
        r_10 = _e247;
    }
    let _e249 = includeSceneCandidate(300f);
    if _e249 {
        let _e250 = r_10;
        let _e251 = p_37;
        let _e263 = sdBox((_e251 - vec3<f32>(0f, 1.58f, -3.23f)), vec3<f32>(3.25f, 1.62f, 0.045f));
        let _e266 = opU(_e250, vec2<f32>(_e263, 3f));
        r_10 = _e266;
    }
    let _e268 = includeSceneCandidate(400f);
    if _e268 {
        let _e269 = r_10;
        let _e270 = p_37;
        let _e282 = sdBox((_e270 - vec3<f32>(-3.23f, 1.58f, 0f)), vec3<f32>(0.045f, 1.62f, 3.25f));
        let _e285 = opU(_e269, vec2<f32>(_e282, 4f));
        r_10 = _e285;
    }
    let _e287 = includeSceneCandidate(500f);
    if _e287 {
        let _e288 = r_10;
        let _e289 = p_37;
        let _e300 = sdBox((_e289 - vec3<f32>(3.23f, 1.58f, 0f)), vec3<f32>(0.045f, 1.62f, 3.25f));
        let _e303 = opU(_e288, vec2<f32>(_e300, 5f));
        r_10 = _e303;
    }
    let _e305 = includeSceneCandidate(600f);
    if _e305 {
        let _e306 = r_10;
        let _e307 = p_37;
        let _e319 = sdBox((_e307 - vec3<f32>(0f, 3.18f, 0f)), vec3<f32>(3.25f, 0.045f, 3.25f));
        let _e322 = opU(_e306, vec2<f32>(_e319, 6f));
        r_10 = _e322;
    }
    let _e324 = includeSceneCandidate(1401f);
    if _e324 {
        let _e325 = r_10;
        let _e326 = p_37;
        let _e339 = sdRoundBox((_e326 - vec3<f32>(0f, 0.115f, -3.155f)), vec3<f32>(3.18f, 0.105f, 0.045f), 0.02f);
        let _e342 = opU(_e325, vec2<f32>(_e339, 14f));
        r_10 = _e342;
    }
    let _e344 = includeSceneCandidate(1402f);
    if _e344 {
        let _e345 = r_10;
        let _e346 = p_37;
        let _e359 = sdRoundBox((_e346 - vec3<f32>(-3.155f, 0.115f, 0f)), vec3<f32>(0.045f, 0.105f, 3.18f), 0.02f);
        let _e362 = opU(_e345, vec2<f32>(_e359, 14f));
        r_10 = _e362;
    }
    let _e364 = includeSceneCandidate(1403f);
    if _e364 {
        let _e365 = r_10;
        let _e366 = p_37;
        let _e378 = sdRoundBox((_e366 - vec3<f32>(3.155f, 0.115f, 0f)), vec3<f32>(0.045f, 0.105f, 3.18f), 0.02f);
        let _e381 = opU(_e365, vec2<f32>(_e378, 14f));
        r_10 = _e381;
    }
    let _e382 = r_10;
    let _e383 = p_37;
    let _e396 = sdRoundBox((_e383 - vec3<f32>(0f, 3.095f, -1.65f)), vec3<f32>(1.95f, 0.025f, 0.032f), 0.012f);
    let _e399 = opU(_e382, vec2<f32>(_e396, 13f));
    r_10 = _e399;
    let _e400 = r_10;
    let _e401 = p_37;
    let _e414 = sdRoundBox((_e401 - vec3<f32>(-1.95f, 3.095f, -0.4f)), vec3<f32>(0.032f, 0.025f, 1.3f), 0.012f);
    let _e417 = opU(_e400, vec2<f32>(_e414, 13f));
    r_10 = _e417;
    let _e418 = r_10;
    let _e419 = p_37;
    let _e431 = sdRoundBox((_e419 - vec3<f32>(1.95f, 3.095f, -0.4f)), vec3<f32>(0.032f, 0.025f, 1.3f), 0.012f);
    let _e434 = opU(_e418, vec2<f32>(_e431, 13f));
    r_10 = _e434;
    let _e435 = r_10;
    let _e436 = p_37;
    let _e437 = uniforms;
    let _e439 = uniforms;
    let _e441 = uniforms;
    let _e443 = uniforms;
    let _e445 = zoneObj(_e436, _e437.uZone0_, _e439.uZoneShape0_, _e441.uZoneBasis0_, _e443.uZoneMotion0_);
    let _e446 = opU(_e435, _e445);
    r_10 = _e446;
    let _e447 = r_10;
    let _e448 = p_37;
    let _e449 = uniforms;
    let _e451 = uniforms;
    let _e453 = uniforms;
    let _e455 = uniforms;
    let _e457 = zoneObj(_e448, _e449.uZone1_, _e451.uZoneShape1_, _e453.uZoneBasis1_, _e455.uZoneMotion1_);
    let _e458 = opU(_e447, _e457);
    r_10 = _e458;
    let _e459 = r_10;
    let _e460 = p_37;
    let _e461 = uniforms;
    let _e463 = uniforms;
    let _e465 = uniforms;
    let _e467 = uniforms;
    let _e469 = zoneObj(_e460, _e461.uZone2_, _e463.uZoneShape2_, _e465.uZoneBasis2_, _e467.uZoneMotion2_);
    let _e470 = opU(_e459, _e469);
    r_10 = _e470;
    let _e471 = r_10;
    let _e472 = p_37;
    let _e473 = uniforms;
    let _e475 = uniforms;
    let _e477 = uniforms;
    let _e479 = uniforms;
    let _e481 = zoneObj(_e472, _e473.uZone3_, _e475.uZoneShape3_, _e477.uZoneBasis3_, _e479.uZoneMotion3_);
    let _e482 = opU(_e471, _e481);
    r_10 = _e482;
    let _e483 = r_10;
    let _e484 = p_37;
    let _e485 = uniforms;
    let _e487 = uniforms;
    let _e489 = uniforms;
    let _e491 = uniforms;
    let _e493 = zoneObj(_e484, _e485.uZone4_, _e487.uZoneShape4_, _e489.uZoneBasis4_, _e491.uZoneMotion4_);
    let _e494 = opU(_e483, _e493);
    r_10 = _e494;
    let _e495 = r_10;
    let _e496 = p_37;
    let _e497 = uniforms;
    let _e499 = uniforms;
    let _e501 = uniforms;
    let _e503 = uniforms;
    let _e505 = zoneObj(_e496, _e497.uZone5_, _e499.uZoneShape5_, _e501.uZoneBasis5_, _e503.uZoneMotion5_);
    let _e506 = opU(_e495, _e505);
    r_10 = _e506;
    let _e507 = r_10;
    let _e508 = p_37;
    let _e509 = uniforms;
    let _e511 = uniforms;
    let _e513 = uniforms;
    let _e515 = uniforms;
    let _e517 = zoneObj(_e508, _e509.uZone6_, _e511.uZoneShape6_, _e513.uZoneBasis6_, _e515.uZoneMotion6_);
    let _e518 = opU(_e507, _e517);
    r_10 = _e518;
    let _e519 = r_10;
    let _e520 = p_37;
    let _e521 = uniforms;
    let _e523 = uniforms;
    let _e525 = uniforms;
    let _e527 = uniforms;
    let _e529 = zoneObj(_e520, _e521.uZone7_, _e523.uZoneShape7_, _e525.uZoneBasis7_, _e527.uZoneMotion7_);
    let _e530 = opU(_e519, _e529);
    r_10 = _e530;
    let _e532 = includeSceneCandidate(1921f);
    if _e532 {
        let _e533 = r_10;
        let _e534 = p_37;
        let _e535 = uniforms;
        let _e537 = uniforms;
        let _e539 = rampObj(_e534, _e535.uRamp0_, _e537.uRampMeta0_);
        let _e540 = opU(_e533, _e539);
        r_10 = _e540;
    }
    let _e542 = includeSceneCandidate(1922f);
    if _e542 {
        let _e543 = r_10;
        let _e544 = p_37;
        let _e545 = uniforms;
        let _e547 = uniforms;
        let _e549 = rampObj(_e544, _e545.uRamp1_, _e547.uRampMeta1_);
        let _e550 = opU(_e543, _e549);
        r_10 = _e550;
    }
    let _e552 = includeSceneCandidate(1923f);
    if _e552 {
        let _e553 = r_10;
        let _e554 = p_37;
        let _e555 = uniforms;
        let _e557 = uniforms;
        let _e559 = rampObj(_e554, _e555.uRamp2_, _e557.uRampMeta2_);
        let _e560 = opU(_e553, _e559);
        r_10 = _e560;
    }
    let _e562 = includeSceneCandidate(1911f);
    if _e562 {
        let _e563 = r_10;
        let _e564 = p_37;
        let _e565 = uniforms;
        let _e567 = uniforms;
        let _e569 = platformObj(_e564, _e565.uPlat0_, _e567.uPlatMeta0_);
        let _e570 = opU(_e563, _e569);
        r_10 = _e570;
    }
    let _e572 = includeSceneCandidate(1912f);
    if _e572 {
        let _e573 = r_10;
        let _e574 = p_37;
        let _e575 = uniforms;
        let _e577 = uniforms;
        let _e579 = platformObj(_e574, _e575.uPlat1_, _e577.uPlatMeta1_);
        let _e580 = opU(_e573, _e579);
        r_10 = _e580;
    }
    let _e582 = includeSceneCandidate(1913f);
    if _e582 {
        let _e583 = r_10;
        let _e584 = p_37;
        let _e585 = uniforms;
        let _e587 = uniforms;
        let _e589 = platformObj(_e584, _e585.uPlat2_, _e587.uPlatMeta2_);
        let _e590 = opU(_e583, _e589);
        r_10 = _e590;
    }
    let _e592 = includeSceneCandidate(1914f);
    if _e592 {
        let _e593 = r_10;
        let _e594 = p_37;
        let _e595 = uniforms;
        let _e597 = uniforms;
        let _e599 = platformObj(_e594, _e595.uPlat3_, _e597.uPlatMeta3_);
        let _e600 = opU(_e593, _e599);
        r_10 = _e600;
    }
    let _e601 = uniforms;
    if (_e601.uTargetType.x < 3.5f) {
        {
            let _e606 = p_37;
            let _e607 = uniforms;
            let _e612 = uniforms;
            let _e616 = uniforms;
            tp = (_e606 - vec3<f32>(_e607.uTarget.x, (0.035f + _e612.uTargetY.x), _e616.uTarget.y));
            let _e623 = uniforms;
            if (_e623.uTargetType.x < 2.5f) {
                let _e628 = tp;
                let _e631 = sdCyl(_e628, 0.49f, 0.02f);
                local_7 = _e631;
            } else {
                let _e632 = tp;
                let _e633 = sdRing(_e632);
                local_7 = _e633;
            }
            let _e635 = local_7;
            d_5 = _e635;
            let _e637 = r_10;
            let _e638 = d_5;
            let _e640 = uniforms;
            let _e645 = opU(_e637, vec2<f32>(_e638, (9f + _e640.uTargetType.x)));
            r_10 = _e645;
        }
    } else {
        {
            let _e646 = r_10;
            let _e647 = p_37;
            let _e648 = uniforms;
            let _e653 = uniforms;
            let _e666 = sdRoundBox((_e647 - vec3<f32>(_e648.uTarget.x, (0.74f + _e653.uTargetY.x), -3.185f)), vec3<f32>(0.58f, 0.7f, 0.03f), 0.045f);
            let _e669 = opU(_e646, vec2<f32>(_e666, 15f));
            r_10 = _e669;
            let _e670 = r_10;
            let _e671 = p_37;
            let _e672 = uniforms;
            let _e677 = uniforms;
            let _e681 = uniforms;
            let _e687 = sdRing((_e671 - vec3<f32>(_e672.uTarget.x, (0.03f + _e677.uTargetY.x), _e681.uTarget.y)));
            let _e690 = opU(_e670, vec2<f32>(_e687, 15f));
            r_10 = _e690;
        }
    }
    let _e692 = includeSceneCandidate(801f);
    if _e692 {
        let _e693 = r_10;
        let _e694 = p_37;
        let _e695 = uniforms;
        let _e697 = obstacle(_e694, _e695.uObs0_);
        let _e698 = opU(_e693, _e697);
        r_10 = _e698;
    }
    let _e700 = includeSceneCandidate(802f);
    if _e700 {
        let _e701 = r_10;
        let _e702 = p_37;
        let _e703 = uniforms;
        let _e705 = obstacle(_e702, _e703.uObs1_);
        let _e706 = opU(_e701, _e705);
        r_10 = _e706;
    }
    let _e708 = includeSceneCandidate(803f);
    if _e708 {
        let _e709 = r_10;
        let _e710 = p_37;
        let _e711 = uniforms;
        let _e713 = obstacle(_e710, _e711.uObs2_);
        let _e714 = opU(_e709, _e713);
        r_10 = _e714;
    }
    let _e716 = includeSceneCandidate(804f);
    if _e716 {
        let _e717 = r_10;
        let _e718 = p_37;
        let _e719 = uniforms;
        let _e721 = obstacle(_e718, _e719.uObs3_);
        let _e722 = opU(_e717, _e721);
        r_10 = _e722;
    }
    let _e724 = includeSceneCandidate(805f);
    if _e724 {
        let _e725 = r_10;
        let _e726 = p_37;
        let _e727 = uniforms;
        let _e729 = obstacle(_e726, _e727.uObs4_);
        let _e730 = opU(_e725, _e729);
        r_10 = _e730;
    }
    let _e732 = includeSceneCandidate(806f);
    if _e732 {
        let _e733 = r_10;
        let _e734 = p_37;
        let _e735 = uniforms;
        let _e737 = obstacle(_e734, _e735.uObs5_);
        let _e738 = opU(_e733, _e737);
        r_10 = _e738;
    }
    let _e740 = includeSceneCandidate(2241f);
    if _e740 {
        let _e741 = r_10;
        let _e742 = p_37;
        let _e743 = uniforms;
        let _e745 = uniforms;
        let _e747 = uniforms;
        let _e749 = bumperObj(_e742, _e743.uBump0_, _e745.uBumpFx0_, _e747.uBumpWarp0_);
        let _e750 = opU(_e741, _e749);
        r_10 = _e750;
    }
    let _e752 = includeSceneCandidate(2242f);
    if _e752 {
        let _e753 = r_10;
        let _e754 = p_37;
        let _e755 = uniforms;
        let _e757 = uniforms;
        let _e759 = uniforms;
        let _e761 = bumperObj(_e754, _e755.uBump1_, _e757.uBumpFx1_, _e759.uBumpWarp1_);
        let _e762 = opU(_e753, _e761);
        r_10 = _e762;
    }
    let _e764 = includeSceneCandidate(2243f);
    if _e764 {
        let _e765 = r_10;
        let _e766 = p_37;
        let _e767 = uniforms;
        let _e769 = uniforms;
        let _e771 = uniforms;
        let _e773 = bumperObj(_e766, _e767.uBump2_, _e769.uBumpFx2_, _e771.uBumpWarp2_);
        let _e774 = opU(_e765, _e773);
        r_10 = _e774;
    }
    let _e775 = uniforms;
    let _e778 = -(_e775.uCubeQ.xyz);
    let _e779 = uniforms;
    iq = vec4<f32>(_e778.x, _e778.y, _e778.z, _e779.uCubeQ.w);
    let _e787 = iq;
    let _e788 = p_37;
    let _e789 = cubeCenter();
    let _e791 = qrot(_e787, (_e788 - _e789));
    cp = _e791;
    let _e794 = includeSceneCandidate(700f);
    let _e796 = uniforms;
    if (!(_e794) || (_e796.uTransition.x < 0.008f)) {
        let _e802 = r_10;
        return _e802;
    }
    let _e803 = r_10;
    let _e804 = cp;
    let _e807 = cubeScale();
    let _e810 = cubeScale();
    let _e812 = sdRoundBox(_e804, (vec3(0.245f) * _e807), (0.038f * _e810));
    let _e815 = opU(_e803, vec2<f32>(_e812, 7f));
    return _e815;
}

fn normalAt(p_38: vec3<f32>) -> vec3<f32> {
    var p_39: vec3<f32>;
    var gradient: vec3<f32> = vec3(0f);
    var i_2: i32 = 0i;
    var local_8: vec3<f32>;
    var local_9: vec3<f32>;
    var axis: vec3<f32>;
    var local_10: f32;
    var side: f32;

    p_39 = p_38;
    loop {
        let _e209 = i_2;
        if !((_e209 < 6i)) {
            break;
        }
        {
            let _e216 = i_2;
            if (_e216 < 2i) {
                local_9 = vec3<f32>(1f, 0f, 0f);
            } else {
                let _e226 = i_2;
                if (_e226 < 4i) {
                    local_8 = vec3<f32>(0f, 1f, 0f);
                } else {
                    local_8 = vec3<f32>(0f, 0f, 1f);
                }
                let _e244 = local_8;
                local_9 = _e244;
            }
            let _e246 = local_9;
            axis = _e246;
            let _e248 = i_2;
            let _e249 = f32(_e248);
            if ((_e249 - (floor((_e249 / 2f)) * 2f)) < 0.5f) {
                local_10 = 1f;
            } else {
                local_10 = -1f;
            }
            let _e261 = local_10;
            side = _e261;
            let _e263 = gradient;
            let _e264 = axis;
            let _e265 = side;
            let _e267 = p_39;
            let _e268 = axis;
            let _e269 = side;
            let _e274 = mapScene((_e267 + (_e268 * (_e269 * 0.0022f))));
            gradient = (_e263 + ((_e264 * _e265) * _e274.x));
        }
        continuing {
            let _e213 = i_2;
            i_2 = (_e213 + 1i);
        }
    }
    let _e278 = gradient;
    return normalize(_e278);
}

fn cubeLocal(p_40: vec3<f32>) -> vec3<f32> {
    var p_41: vec3<f32>;

    p_41 = p_40;
    let _e203 = uniforms;
    let _e206 = -(_e203.uCubeQ.xyz);
    let _e207 = uniforms;
    let _e214 = p_41;
    let _e215 = cubeCenter();
    let _e217 = qrot(vec4<f32>(_e206.x, _e206.y, _e206.z, _e207.uCubeQ.w), (_e214 - _e215));
    return _e217;
}

fn cubeEdge(local_11: vec3<f32>) -> f32 {
    var local_12: vec3<f32>;
    var a_3: vec3<f32>;
    var middle: f32;

    local_12 = local_11;
    let _e203 = local_12;
    a_3 = abs(_e203);
    let _e206 = a_3;
    let _e208 = a_3;
    let _e211 = a_3;
    let _e214 = a_3;
    let _e216 = a_3;
    let _e218 = a_3;
    let _e223 = a_3;
    let _e225 = a_3;
    let _e227 = a_3;
    middle = ((((_e206.x + _e208.y) + _e211.z) - min(_e214.x, min(_e216.y, _e218.z))) - max(_e223.x, max(_e225.y, _e227.z)));
    let _e234 = cubeScale();
    let _e237 = cubeScale();
    let _e239 = middle;
    return smoothstep((0.185f * _e234), (0.232f * _e237), _e239);
}

fn softShadow(ro: vec3<f32>, rd: vec3<f32>, mint: f32, maxt: f32) -> f32 {
    var ro_1: vec3<f32>;
    var rd_1: vec3<f32>;
    var mint_1: f32;
    var maxt_1: f32;
    var visibility: f32 = 1f;
    var t: f32;
    var previous: f32 = 0.1f;
    var i_3: i32 = 0i;
    var sceneSample: vec2<f32>;
    var h_5: f32;
    var y: f32;
    var d_6: f32;

    ro_1 = ro;
    rd_1 = rd;
    mint_1 = mint;
    maxt_1 = maxt;
    let _e211 = mint_1;
    t = _e211;
    loop {
        let _e217 = i_3;
        if !((_e217 < 28i)) {
            break;
        }
        {
            let _e224 = ro_1;
            let _e225 = rd_1;
            let _e226 = t;
            let _e229 = mapScene((_e224 + (_e225 * _e226)));
            sceneSample = _e229;
            let _e231 = sceneSample;
            h_5 = _e231.x;
            let _e234 = h_5;
            if (_e234 < 0.0006f) {
                return 0f;
            }
            let _e238 = h_5;
            let _e239 = h_5;
            let _e242 = previous;
            y = ((_e238 * _e239) / max((2f * _e242), 0.001f));
            let _e248 = h_5;
            let _e249 = h_5;
            let _e251 = y;
            let _e252 = y;
            d_6 = sqrt(max(((_e248 * _e249) - (_e251 * _e252)), 0f));
            let _e259 = sceneSample;
            let _e263 = sceneSample;
            let _e267 = sceneSample;
            if ((_e259.y > 6.5f) && ((_e263.y < 12.5f) || (_e267.y > 13.5f))) {
                let _e273 = visibility;
                let _e275 = d_6;
                let _e277 = t;
                let _e278 = y;
                visibility = min(_e273, ((14f * _e275) / max((_e277 - _e278), 0.015f)));
            }
            let _e284 = h_5;
            previous = _e284;
            let _e285 = t;
            let _e286 = h_5;
            t = (_e285 + clamp((_e286 * 0.85f), 0.012f, 0.24f));
            let _e293 = visibility;
            let _e296 = t;
            let _e297 = maxt_1;
            if ((_e293 < 0.015f) || (_e296 > _e297)) {
                break;
            }
        }
        continuing {
            let _e221 = i_3;
            i_3 = (_e221 + 1i);
        }
    }
    let _e300 = visibility;
    return clamp(_e300, 0f, 1f);
}

fn ao(p_42: vec3<f32>, n: vec3<f32>) -> f32 {
    var p_43: vec3<f32>;
    var n_1: vec3<f32>;
    var occ: f32 = 0f;
    var weight: f32 = 1f;
    var total: f32 = 0f;
    var i_4: i32 = 0i;
    var h_6: f32;
    var d_7: f32;

    p_43 = p_42;
    n_1 = n;
    loop {
        let _e213 = i_4;
        if !((_e213 < 4i)) {
            break;
        }
        {
            let _e222 = i_4;
            h_6 = (0.018f + (0.052f * f32(_e222)));
            let _e227 = p_43;
            let _e228 = n_1;
            let _e229 = h_6;
            let _e232 = mapScene((_e227 + (_e228 * _e229)));
            d_7 = _e232.x;
            let _e235 = occ;
            let _e236 = h_6;
            let _e237 = d_7;
            let _e239 = h_6;
            let _e244 = weight;
            occ = (_e235 + (clamp(((_e236 - _e237) / _e239), 0f, 1f) * _e244));
            let _e247 = total;
            let _e248 = weight;
            total = (_e247 + _e248);
            let _e250 = weight;
            weight = (_e250 * 0.72f);
        }
        continuing {
            let _e217 = i_4;
            i_4 = (_e217 + 1i);
        }
    }
    let _e254 = occ;
    let _e255 = total;
    return clamp((1f - ((_e254 / max(_e255, 0.001f)) * 0.85f)), 0f, 1f);
}

fn targetColor() -> vec3<f32> {
    var local_13: vec3<f32>;
    var local_14: vec3<f32>;
    var local_15: vec3<f32>;

    let _e201 = uniforms;
    if (_e201.uTargetType.x < 1.5f) {
        local_15 = vec3<f32>(0.045f, 0.92f, 0.3f);
    } else {
        let _e210 = uniforms;
        if (_e210.uTargetType.x < 2.5f) {
            local_14 = vec3<f32>(0.055f, 0.32f, 1f);
        } else {
            let _e219 = uniforms;
            if (_e219.uTargetType.x < 3.5f) {
                local_13 = vec3<f32>(1f, 0.56f, 0.055f);
            } else {
                local_13 = vec3<f32>(0.025f, 1f, 0.4f);
            }
            let _e233 = local_13;
            local_14 = _e233;
        }
        let _e235 = local_14;
        local_15 = _e235;
    }
    let _e237 = local_15;
    return _e237;
}

fn portalEnergy(p_44: vec3<f32>, rd_2: vec3<f32>) -> vec3<f32> {
    var p_45: vec3<f32>;
    var rd_3: vec3<f32>;
    var wave: f32;
    var uv: vec2<f32>;
    var rim: f32;
    var energy: f32 = 0f;
    var transmission: f32 = 1f;
    var i_5: i32 = 0i;
    var depth: f32;
    var q_5: vec2<f32>;
    var radius_1: f32;
    var angle: f32;
    var swirl: f32;
    var density: f32;
    var extinction: f32;

    p_45 = p_44;
    rd_3 = rd_2;
    let _e205 = p_45;
    let _e210 = p_45;
    let _e212 = uniforms;
    if ((_e205.z > -3.09f) || (_e210.y < (_e212.uTargetY.x + 0.12f))) {
        {
            let _e221 = p_45;
            let _e223 = uniforms;
            let _e230 = effectTime();
            wave = (0.5f + (0.5f * sin(((length((_e221.xz - _e223.uTarget.xy)) * 24f) - (_e230 * 1.2f)))));
            let _e244 = wave;
            return (vec3<f32>(0.025f, 1f, 0.4f) * (1.1f + (0.22f * _e244)));
        }
    }
    let _e248 = p_45;
    let _e250 = uniforms;
    let _e255 = uniforms;
    uv = ((_e248.xy - vec2<f32>(_e250.uTarget.x, (0.74f + _e255.uTargetY.x))) / vec2<f32>(0.54f, 0.66f));
    let _e266 = uv;
    let _e269 = uv;
    let _e279 = aaLine((abs((max(abs(_e266.x), abs(_e269.y)) - 0.9f)) * 0.54f), 0.025f);
    rim = _e279;
    loop {
        let _e287 = i_5;
        if !((_e287 < 3i)) {
            break;
        }
        {
            let _e294 = i_5;
            depth = ((f32(_e294) + 0.5f) / 3f);
            let _e302 = uv;
            let _e303 = rd_3;
            let _e305 = rd_3;
            let _e312 = depth;
            q_5 = (_e302 + (((_e303.xy / vec2(max(abs(_e305.z), 0.25f))) * _e312) * 0.16f));
            let _e318 = q_5;
            let _e319 = q_5;
            let _e322 = depth;
            let _e325 = effectTime();
            let _e330 = noise(((_e319 * 2.8f) + vec2<f32>((_e322 * 7f), (_e325 * 0.09f))));
            let _e333 = q_5;
            let _e337 = depth;
            let _e342 = noise(((_e333 * 2.8f) + vec2<f32>(8f, (_e337 * 5f))));
            q_5 = (_e318 + (vec2<f32>((_e330 - 0.5f), (_e342 - 0.5f)) * 0.09f));
            let _e349 = q_5;
            radius_1 = length(_e349);
            let _e352 = q_5;
            let _e356 = q_5;
            angle = atan2((_e352.y + 0.0001f), (_e356.x + 0.0001f));
            let _e364 = radius_1;
            let _e367 = angle;
            let _e371 = depth;
            let _e375 = effectTime();
            swirl = pow((0.5f + (0.5f * sin(((((_e364 * 18f) - (_e367 * 2f)) + (_e371 * 2.4f)) - (_e375 * 0.9f))))), 3f);
            let _e387 = swirl;
            let _e393 = radius_1;
            density = ((0.1f + (1.8f * _e387)) * (1f - smoothstep(0.35f, 1.05f, _e393)));
            let _e398 = density;
            extinction = exp(((-(_e398) * 2f) / 3f));
            let _e407 = energy;
            let _e408 = transmission;
            let _e410 = extinction;
            energy = (_e407 + (_e408 * (1f - _e410)));
            let _e414 = transmission;
            let _e415 = extinction;
            transmission = (_e414 * _e415);
        }
        continuing {
            let _e291 = i_5;
            i_5 = (_e291 + 1i);
        }
    }
    let _e422 = energy;
    let _e431 = rim;
    return ((vec3<f32>(0.025f, 0.85f, 0.34f) * (0.1f + (_e422 * 1.85f))) + ((vec3<f32>(0.08f, 1.3f, 0.66f) * _e431) * 0.75f));
}

fn stripeIntegral(x: f32, duty: f32) -> f32 {
    var x_1: f32;
    var duty_1: f32;

    x_1 = x;
    duty_1 = duty;
    let _e205 = x_1;
    let _e207 = duty_1;
    let _e209 = x_1;
    let _e211 = duty_1;
    return ((floor(_e205) * _e207) + min(fract(_e209), _e211));
}

fn stripeCoverage(coordinate: f32, period: f32, width: f32, footprint: f32) -> f32 {
    var coordinate_1: f32;
    var period_1: f32;
    var width_1: f32;
    var footprint_1: f32;
    var duty_2: f32;
    var span_1: f32;
    var x_2: f32;

    coordinate_1 = coordinate;
    period_1 = period;
    width_1 = width;
    footprint_1 = footprint;
    let _e209 = width_1;
    let _e210 = period_1;
    duty_2 = clamp((_e209 / _e210), 0f, 1f);
    let _e216 = footprint_1;
    let _e217 = period_1;
    span_1 = max((_e216 / _e217), 0.002f);
    let _e222 = span_1;
    if (_e222 >= 1f) {
        let _e225 = duty_2;
        return _e225;
    }
    let _e226 = coordinate_1;
    let _e227 = period_1;
    let _e229 = duty_2;
    x_2 = ((_e226 / _e227) + (_e229 * 0.5f));
    let _e234 = x_2;
    let _e235 = span_1;
    let _e239 = duty_2;
    let _e240 = stripeIntegral((_e234 + (_e235 * 0.5f)), _e239);
    let _e241 = x_2;
    let _e242 = span_1;
    let _e246 = duty_2;
    let _e247 = stripeIntegral((_e241 - (_e242 * 0.5f)), _e246);
    let _e249 = span_1;
    return clamp(((_e240 - _e247) / _e249), 0f, 1f);
}

fn filteredStripe(coordinate_2: f32, period_2: f32, width_2: f32) -> f32 {
    var coordinate_3: f32;
    var period_3: f32;
    var width_3: f32;

    coordinate_3 = coordinate_2;
    period_3 = period_2;
    width_3 = width_2;
    let _e207 = coordinate_3;
    let _e208 = period_3;
    let _e209 = width_3;
    let _e210 = gFootprint;
    let _e211 = stripeCoverage(_e207, _e208, _e209, _e210);
    return _e211;
}

fn materialNoise(p_46: vec2<f32>, frequency_6: f32) -> vec3<f32> {
    var p_47: vec2<f32>;
    var frequency_7: f32;
    var i_6: vec2<f32>;
    var f_1: vec2<f32>;
    var u_1: vec2<f32>;
    var du: vec2<f32>;
    var a_4: f32;
    var b_8: f32;
    var c: f32;
    var d_8: f32;
    var w_2: f32;

    p_47 = p_46;
    frequency_7 = frequency_6;
    let _e205 = p_47;
    i_6 = floor(_e205);
    let _e208 = p_47;
    f_1 = fract(_e208);
    let _e211 = f_1;
    let _e212 = f_1;
    let _e214 = f_1;
    let _e216 = f_1;
    let _e217 = f_1;
    u_1 = (((_e211 * _e212) * _e214) * ((_e216 * ((_e217 * 6f) - vec2(15f))) + vec2(10f)));
    let _e230 = f_1;
    let _e232 = f_1;
    let _e234 = f_1;
    let _e239 = f_1;
    du = ((((30f * _e230) * _e232) * (_e234 - vec2(1f))) * (_e239 - vec2(1f)));
    let _e245 = i_6;
    let _e246 = hash(_e245);
    a_4 = _e246;
    let _e248 = i_6;
    let _e255 = hash((_e248 + vec2<f32>(1f, 0f)));
    b_8 = _e255;
    let _e257 = i_6;
    let _e264 = hash((_e257 + vec2<f32>(0f, 1f)));
    c = _e264;
    let _e266 = i_6;
    let _e273 = hash((_e266 + vec2<f32>(1f, 1f)));
    d_8 = _e273;
    let _e275 = frequency_7;
    let _e276 = detailWeight(_e275);
    w_2 = _e276;
    let _e279 = a_4;
    let _e280 = b_8;
    let _e281 = u_1;
    let _e284 = c;
    let _e285 = d_8;
    let _e286 = u_1;
    let _e289 = u_1;
    let _e294 = w_2;
    let _e297 = du;
    let _e299 = b_8;
    let _e300 = a_4;
    let _e302 = d_8;
    let _e303 = c;
    let _e305 = u_1;
    let _e309 = w_2;
    let _e311 = du;
    let _e313 = c;
    let _e314 = a_4;
    let _e316 = d_8;
    let _e317 = b_8;
    let _e319 = u_1;
    let _e323 = w_2;
    return vec3<f32>((0.5f + ((mix(mix(_e279, _e280, _e281.x), mix(_e284, _e285, _e286.x), _e289.y) - 0.5f) * _e294)), ((_e297.x * mix((_e299 - _e300), (_e302 - _e303), _e305.y)) * _e309), ((_e311.y * mix((_e313 - _e314), (_e316 - _e317), _e319.x)) * _e323));
}

fn faceUV(p_48: vec3<f32>, n_2: vec3<f32>) -> vec2<f32> {
    var p_49: vec3<f32>;
    var n_3: vec3<f32>;
    var a_5: vec3<f32>;
    var local_16: vec2<f32>;
    var local_17: vec2<f32>;

    p_49 = p_48;
    n_3 = n_2;
    let _e205 = n_3;
    a_5 = abs(_e205);
    let _e208 = a_5;
    let _e210 = a_5;
    let _e212 = a_5;
    if (_e208.y >= max(_e210.x, _e212.z)) {
        let _e216 = p_49;
        local_17 = _e216.xz;
    } else {
        let _e218 = a_5;
        let _e220 = a_5;
        if (_e218.x >= _e220.z) {
            let _e223 = p_49;
            local_16 = _e223.zy;
        } else {
            let _e225 = p_49;
            local_16 = _e225.xy;
        }
        let _e228 = local_16;
        local_17 = _e228;
    }
    let _e230 = local_17;
    return _e230;
}

fn microRelief(uv_1: vec2<f32>, frequency_8: vec2<f32>, strength: f32) -> vec3<f32> {
    var uv_2: vec2<f32>;
    var frequency_9: vec2<f32>;
    var strength_1: f32;
    var r_11: vec3<f32> = vec3(0f);
    var f_2: f32;
    var w_3: f32;

    uv_2 = uv_1;
    frequency_9 = frequency_8;
    strength_1 = strength;
    let _e211 = frequency_9;
    let _e213 = frequency_9;
    f_2 = max(_e211.x, _e213.y);
    let _e217 = f_2;
    let _e218 = detailWeight(_e217);
    w_3 = _e218;
    let _e220 = uv_2;
    let _e221 = frequency_9;
    let _e223 = f_2;
    let _e224 = materialNoise((_e220 * _e221), _e223);
    let _e226 = strength_1;
    let _e227 = (_e224.yz * _e226);
    let _e228 = strength_1;
    let _e229 = strength_1;
    let _e232 = w_3;
    let _e233 = w_3;
    r_11 = vec3<f32>(_e227.x, _e227.y, ((_e228 * _e229) * (1f - (_e232 * _e233))));
    let _e240 = r_11;
    return _e240;
}

fn edgeMask(p_50: vec3<f32>, extent_2: vec3<f32>) -> f32 {
    var p_51: vec3<f32>;
    var extent_3: vec3<f32>;
    var d_9: vec3<f32>;
    var second: f32;

    p_51 = p_50;
    extent_3 = extent_2;
    let _e205 = p_51;
    let _e207 = extent_3;
    d_9 = (abs(_e205) / max(_e207, vec3(0.03f)));
    let _e213 = d_9;
    let _e215 = d_9;
    let _e218 = d_9;
    let _e221 = d_9;
    let _e223 = d_9;
    let _e225 = d_9;
    let _e230 = d_9;
    let _e232 = d_9;
    let _e234 = d_9;
    second = ((((_e213.x + _e215.y) + _e218.z) - min(_e221.x, min(_e223.y, _e225.z))) - max(_e230.x, max(_e232.y, _e234.z)));
    let _e242 = second;
    return smoothstep(0.78f, 0.98f, _e242);
}

fn zoneSlot(slot: f32, zone: ptr<function, vec4<f32>>, shape_8: ptr<function, vec4<f32>>, basis_8: ptr<function, vec4<f32>>, motion_6: ptr<function, vec4<f32>>) {
    var slot_1: f32;
    var a_6: vec4<f32>;
    var b_9: vec4<f32>;

    slot_1 = slot;
    let _e212 = slot_1;
    a_6 = (vec4(1f) - step(vec4(0.5f), abs((vec4(_e212) - vec4<f32>(0f, 1f, 2f, 3f)))));
    let _e233 = slot_1;
    b_9 = (vec4(1f) - step(vec4(0.5f), abs((vec4(_e233) - vec4<f32>(4f, 5f, 6f, 7f)))));
    let _e249 = uniforms;
    let _e251 = a_6;
    let _e254 = uniforms;
    let _e256 = a_6;
    let _e260 = uniforms;
    let _e262 = a_6;
    let _e266 = uniforms;
    let _e268 = a_6;
    let _e272 = uniforms;
    let _e274 = b_9;
    let _e278 = uniforms;
    let _e280 = b_9;
    let _e284 = uniforms;
    let _e286 = b_9;
    let _e290 = uniforms;
    let _e292 = b_9;
    (*zone) = ((((((((_e249.uZone0_ * _e251.x) + (_e254.uZone1_ * _e256.y)) + (_e260.uZone2_ * _e262.z)) + (_e266.uZone3_ * _e268.w)) + (_e272.uZone4_ * _e274.x)) + (_e278.uZone5_ * _e280.y)) + (_e284.uZone6_ * _e286.z)) + (_e290.uZone7_ * _e292.w));
    let _e296 = uniforms;
    let _e298 = a_6;
    let _e301 = uniforms;
    let _e303 = a_6;
    let _e307 = uniforms;
    let _e309 = a_6;
    let _e313 = uniforms;
    let _e315 = a_6;
    let _e319 = uniforms;
    let _e321 = b_9;
    let _e325 = uniforms;
    let _e327 = b_9;
    let _e331 = uniforms;
    let _e333 = b_9;
    let _e337 = uniforms;
    let _e339 = b_9;
    (*shape_8) = ((((((((_e296.uZoneShape0_ * _e298.x) + (_e301.uZoneShape1_ * _e303.y)) + (_e307.uZoneShape2_ * _e309.z)) + (_e313.uZoneShape3_ * _e315.w)) + (_e319.uZoneShape4_ * _e321.x)) + (_e325.uZoneShape5_ * _e327.y)) + (_e331.uZoneShape6_ * _e333.z)) + (_e337.uZoneShape7_ * _e339.w));
    let _e343 = uniforms;
    let _e345 = a_6;
    let _e348 = uniforms;
    let _e350 = a_6;
    let _e354 = uniforms;
    let _e356 = a_6;
    let _e360 = uniforms;
    let _e362 = a_6;
    let _e366 = uniforms;
    let _e368 = b_9;
    let _e372 = uniforms;
    let _e374 = b_9;
    let _e378 = uniforms;
    let _e380 = b_9;
    let _e384 = uniforms;
    let _e386 = b_9;
    (*basis_8) = ((((((((_e343.uZoneBasis0_ * _e345.x) + (_e348.uZoneBasis1_ * _e350.y)) + (_e354.uZoneBasis2_ * _e356.z)) + (_e360.uZoneBasis3_ * _e362.w)) + (_e366.uZoneBasis4_ * _e368.x)) + (_e372.uZoneBasis5_ * _e374.y)) + (_e378.uZoneBasis6_ * _e380.z)) + (_e384.uZoneBasis7_ * _e386.w));
    let _e390 = uniforms;
    let _e392 = a_6;
    let _e395 = uniforms;
    let _e397 = a_6;
    let _e401 = uniforms;
    let _e403 = a_6;
    let _e407 = uniforms;
    let _e409 = a_6;
    let _e413 = uniforms;
    let _e415 = b_9;
    let _e419 = uniforms;
    let _e421 = b_9;
    let _e425 = uniforms;
    let _e427 = b_9;
    let _e431 = uniforms;
    let _e433 = b_9;
    (*motion_6) = ((((((((_e390.uZoneMotion0_ * _e392.x) + (_e395.uZoneMotion1_ * _e397.y)) + (_e401.uZoneMotion2_ * _e403.z)) + (_e407.uZoneMotion3_ * _e409.w)) + (_e413.uZoneMotion4_ * _e415.x)) + (_e419.uZoneMotion5_ * _e421.y)) + (_e425.uZoneMotion6_ * _e427.z)) + (_e431.uZoneMotion7_ * _e433.w));
    return;
}

fn materialCoordinates(m: f32, p_52: vec3<f32>, q_6: ptr<function, vec3<f32>>, extent_4: ptr<function, vec3<f32>>, seed: ptr<function, f32>) {
    var m_1: f32;
    var p_53: vec3<f32>;
    var best: f32 = 100f;
    var d_10: f32;
    var i_7: i32 = 0i;
    var slot_2: f32;
    var instance: f32;
    var zone_1: vec4<f32>;
    var shape_9: vec4<f32>;
    var basis_9: vec4<f32>;
    var motion_7: vec4<f32>;
    var size_1: vec3<f32>;
    var h_7: f32;
    var h_8: f32;
    var h_9: f32;

    m_1 = m;
    p_53 = p_52;
    let _e208 = gHitMaterial;
    let _e209 = m_1;
    let _e211 = p_53;
    let _e212 = gHitPoint;
    if ((_e208 == _e209) && (distance(_e211, _e212) < 0.0001f)) {
        {
            let _e217 = gHitCoordinates;
            (*q_6) = _e217;
            let _e218 = gHitExtent;
            (*extent_4) = _e218;
            let _e219 = gHitSeed;
            (*seed) = _e219;
            return;
        }
    }
    let _e220 = p_53;
    (*q_6) = _e220;
    (*extent_4) = vec3(1f);
    (*seed) = 0f;
    let _e228 = m_1;
    let _e231 = m_1;
    if ((_e228 > 6.5f) && (_e231 < 7.5f)) {
        {
            let _e235 = p_53;
            let _e236 = cubeLocal(_e235);
            (*q_6) = _e236;
            let _e239 = cubeScale();
            (*extent_4) = (vec3(0.245f) * _e239);
            return;
        }
    }
    let _e241 = m_1;
    let _e244 = m_1;
    if ((_e241 > 7.5f) && (_e244 < 8.5f)) {
        {
            let _e249 = includeCandidate(801f);
            let _e250 = uniforms;
            if (_e249 && (_e250.uObs0_.z > 0.001f)) {
                {
                    let _e256 = p_53;
                    let _e257 = uniforms;
                    let _e259 = obstacle(_e256, _e257.uObs0_);
                    d_10 = abs(_e259.x);
                    let _e262 = d_10;
                    let _e263 = best;
                    if (_e262 < _e263) {
                        {
                            let _e265 = d_10;
                            best = _e265;
                            let _e266 = p_53;
                            let _e267 = uniforms;
                            let _e271 = uniforms;
                            (*q_6) = (_e266 - vec3<f32>(_e267.uObs0_.x, 0.245f, _e271.uObs0_.y));
                            let _e276 = uniforms;
                            let _e282 = uniforms;
                            (*extent_4) = vec3<f32>((_e276.uObs0_.z * 0.5f), 0.245f, (_e282.uObs0_.w * 0.5f));
                            (*seed) = 1f;
                        }
                    }
                }
            }
            let _e290 = includeCandidate(802f);
            let _e291 = uniforms;
            if (_e290 && (_e291.uObs1_.z > 0.001f)) {
                {
                    let _e297 = p_53;
                    let _e298 = uniforms;
                    let _e300 = obstacle(_e297, _e298.uObs1_);
                    d_10 = abs(_e300.x);
                    let _e303 = d_10;
                    let _e304 = best;
                    if (_e303 < _e304) {
                        {
                            let _e306 = d_10;
                            best = _e306;
                            let _e307 = p_53;
                            let _e308 = uniforms;
                            let _e312 = uniforms;
                            (*q_6) = (_e307 - vec3<f32>(_e308.uObs1_.x, 0.245f, _e312.uObs1_.y));
                            let _e317 = uniforms;
                            let _e323 = uniforms;
                            (*extent_4) = vec3<f32>((_e317.uObs1_.z * 0.5f), 0.245f, (_e323.uObs1_.w * 0.5f));
                            (*seed) = 2f;
                        }
                    }
                }
            }
            let _e331 = includeCandidate(803f);
            let _e332 = uniforms;
            if (_e331 && (_e332.uObs2_.z > 0.001f)) {
                {
                    let _e338 = p_53;
                    let _e339 = uniforms;
                    let _e341 = obstacle(_e338, _e339.uObs2_);
                    d_10 = abs(_e341.x);
                    let _e344 = d_10;
                    let _e345 = best;
                    if (_e344 < _e345) {
                        {
                            let _e347 = d_10;
                            best = _e347;
                            let _e348 = p_53;
                            let _e349 = uniforms;
                            let _e353 = uniforms;
                            (*q_6) = (_e348 - vec3<f32>(_e349.uObs2_.x, 0.245f, _e353.uObs2_.y));
                            let _e358 = uniforms;
                            let _e364 = uniforms;
                            (*extent_4) = vec3<f32>((_e358.uObs2_.z * 0.5f), 0.245f, (_e364.uObs2_.w * 0.5f));
                            (*seed) = 3f;
                        }
                    }
                }
            }
            let _e372 = includeCandidate(804f);
            let _e373 = uniforms;
            if (_e372 && (_e373.uObs3_.z > 0.001f)) {
                {
                    let _e379 = p_53;
                    let _e380 = uniforms;
                    let _e382 = obstacle(_e379, _e380.uObs3_);
                    d_10 = abs(_e382.x);
                    let _e385 = d_10;
                    let _e386 = best;
                    if (_e385 < _e386) {
                        {
                            let _e388 = d_10;
                            best = _e388;
                            let _e389 = p_53;
                            let _e390 = uniforms;
                            let _e394 = uniforms;
                            (*q_6) = (_e389 - vec3<f32>(_e390.uObs3_.x, 0.245f, _e394.uObs3_.y));
                            let _e399 = uniforms;
                            let _e405 = uniforms;
                            (*extent_4) = vec3<f32>((_e399.uObs3_.z * 0.5f), 0.245f, (_e405.uObs3_.w * 0.5f));
                            (*seed) = 4f;
                        }
                    }
                }
            }
            let _e413 = includeCandidate(805f);
            let _e414 = uniforms;
            if (_e413 && (_e414.uObs4_.z > 0.001f)) {
                {
                    let _e420 = p_53;
                    let _e421 = uniforms;
                    let _e423 = obstacle(_e420, _e421.uObs4_);
                    d_10 = abs(_e423.x);
                    let _e426 = d_10;
                    let _e427 = best;
                    if (_e426 < _e427) {
                        {
                            let _e429 = d_10;
                            best = _e429;
                            let _e430 = p_53;
                            let _e431 = uniforms;
                            let _e435 = uniforms;
                            (*q_6) = (_e430 - vec3<f32>(_e431.uObs4_.x, 0.245f, _e435.uObs4_.y));
                            let _e440 = uniforms;
                            let _e446 = uniforms;
                            (*extent_4) = vec3<f32>((_e440.uObs4_.z * 0.5f), 0.245f, (_e446.uObs4_.w * 0.5f));
                            (*seed) = 5f;
                        }
                    }
                }
            }
            let _e454 = includeCandidate(806f);
            let _e455 = uniforms;
            if (_e454 && (_e455.uObs5_.z > 0.001f)) {
                {
                    let _e461 = p_53;
                    let _e462 = uniforms;
                    let _e464 = obstacle(_e461, _e462.uObs5_);
                    d_10 = abs(_e464.x);
                    let _e467 = d_10;
                    let _e468 = best;
                    if (_e467 < _e468) {
                        {
                            let _e470 = d_10;
                            best = _e470;
                            let _e471 = p_53;
                            let _e472 = uniforms;
                            let _e476 = uniforms;
                            (*q_6) = (_e471 - vec3<f32>(_e472.uObs5_.x, 0.245f, _e476.uObs5_.y));
                            let _e481 = uniforms;
                            let _e487 = uniforms;
                            (*extent_4) = vec3<f32>((_e481.uObs5_.z * 0.5f), 0.245f, (_e487.uObs5_.w * 0.5f));
                            (*seed) = 6f;
                            return;
                        }
                    } else {
                        return;
                    }
                }
            } else {
                return;
            }
        }
    } else {
        let _e494 = m_1;
        let _e497 = m_1;
        if ((_e494 > 18.5f) && (_e497 < 19.5f)) {
            {
                let _e502 = includeCandidate(1911f);
                let _e503 = uniforms;
                if (_e502 && (_e503.uPlat0_.z > 0.001f)) {
                    {
                        let _e509 = p_53;
                        let _e510 = uniforms;
                        let _e512 = uniforms;
                        let _e514 = platformObj(_e509, _e510.uPlat0_, _e512.uPlatMeta0_);
                        d_10 = abs(_e514.x);
                        let _e517 = d_10;
                        let _e518 = best;
                        if (_e517 < _e518) {
                            {
                                let _e520 = d_10;
                                best = _e520;
                                let _e521 = p_53;
                                let _e522 = uniforms;
                                let _e525 = uniforms;
                                let _e530 = uniforms;
                                (*q_6) = (_e521 - vec3<f32>(_e522.uPlat0_.x, (_e525.uPlatMeta0_.x * 0.5f), _e530.uPlat0_.y));
                                let _e535 = uniforms;
                                let _e540 = uniforms;
                                let _e545 = uniforms;
                                (*extent_4) = vec3<f32>((_e535.uPlat0_.z * 0.5f), (_e540.uPlatMeta0_.x * 0.5f), (_e545.uPlat0_.w * 0.5f));
                                (*seed) = 11f;
                            }
                        }
                    }
                }
                let _e553 = includeCandidate(1912f);
                let _e554 = uniforms;
                if (_e553 && (_e554.uPlat1_.z > 0.001f)) {
                    {
                        let _e560 = p_53;
                        let _e561 = uniforms;
                        let _e563 = uniforms;
                        let _e565 = platformObj(_e560, _e561.uPlat1_, _e563.uPlatMeta1_);
                        d_10 = abs(_e565.x);
                        let _e568 = d_10;
                        let _e569 = best;
                        if (_e568 < _e569) {
                            {
                                let _e571 = d_10;
                                best = _e571;
                                let _e572 = p_53;
                                let _e573 = uniforms;
                                let _e576 = uniforms;
                                let _e581 = uniforms;
                                (*q_6) = (_e572 - vec3<f32>(_e573.uPlat1_.x, (_e576.uPlatMeta1_.x * 0.5f), _e581.uPlat1_.y));
                                let _e586 = uniforms;
                                let _e591 = uniforms;
                                let _e596 = uniforms;
                                (*extent_4) = vec3<f32>((_e586.uPlat1_.z * 0.5f), (_e591.uPlatMeta1_.x * 0.5f), (_e596.uPlat1_.w * 0.5f));
                                (*seed) = 12f;
                            }
                        }
                    }
                }
                let _e604 = includeCandidate(1913f);
                let _e605 = uniforms;
                if (_e604 && (_e605.uPlat2_.z > 0.001f)) {
                    {
                        let _e611 = p_53;
                        let _e612 = uniforms;
                        let _e614 = uniforms;
                        let _e616 = platformObj(_e611, _e612.uPlat2_, _e614.uPlatMeta2_);
                        d_10 = abs(_e616.x);
                        let _e619 = d_10;
                        let _e620 = best;
                        if (_e619 < _e620) {
                            {
                                let _e622 = d_10;
                                best = _e622;
                                let _e623 = p_53;
                                let _e624 = uniforms;
                                let _e627 = uniforms;
                                let _e632 = uniforms;
                                (*q_6) = (_e623 - vec3<f32>(_e624.uPlat2_.x, (_e627.uPlatMeta2_.x * 0.5f), _e632.uPlat2_.y));
                                let _e637 = uniforms;
                                let _e642 = uniforms;
                                let _e647 = uniforms;
                                (*extent_4) = vec3<f32>((_e637.uPlat2_.z * 0.5f), (_e642.uPlatMeta2_.x * 0.5f), (_e647.uPlat2_.w * 0.5f));
                                (*seed) = 13f;
                            }
                        }
                    }
                }
                let _e655 = includeCandidate(1914f);
                let _e656 = uniforms;
                if (_e655 && (_e656.uPlat3_.z > 0.001f)) {
                    {
                        let _e662 = p_53;
                        let _e663 = uniforms;
                        let _e665 = uniforms;
                        let _e667 = platformObj(_e662, _e663.uPlat3_, _e665.uPlatMeta3_);
                        d_10 = abs(_e667.x);
                        let _e670 = d_10;
                        let _e671 = best;
                        if (_e670 < _e671) {
                            {
                                let _e673 = d_10;
                                best = _e673;
                                let _e674 = p_53;
                                let _e675 = uniforms;
                                let _e678 = uniforms;
                                let _e683 = uniforms;
                                (*q_6) = (_e674 - vec3<f32>(_e675.uPlat3_.x, (_e678.uPlatMeta3_.x * 0.5f), _e683.uPlat3_.y));
                                let _e688 = uniforms;
                                let _e693 = uniforms;
                                let _e698 = uniforms;
                                (*extent_4) = vec3<f32>((_e688.uPlat3_.z * 0.5f), (_e693.uPlatMeta3_.x * 0.5f), (_e698.uPlat3_.w * 0.5f));
                                (*seed) = 14f;
                            }
                        }
                    }
                }
                let _e706 = includeCandidate(1921f);
                let _e707 = uniforms;
                if (_e706 && (_e707.uRamp0_.z > 0.001f)) {
                    {
                        let _e713 = p_53;
                        let _e714 = uniforms;
                        let _e716 = uniforms;
                        let _e718 = rampObj(_e713, _e714.uRamp0_, _e716.uRampMeta0_);
                        d_10 = abs(_e718.x);
                        let _e721 = d_10;
                        let _e722 = best;
                        if (_e721 < _e722) {
                            {
                                let _e724 = d_10;
                                best = _e724;
                                let _e725 = p_53;
                                let _e726 = uniforms;
                                let _e729 = uniforms;
                                let _e732 = uniforms;
                                let _e738 = uniforms;
                                (*q_6) = (_e725 - vec3<f32>(_e726.uRamp0_.x, ((_e729.uRampMeta0_.x + _e732.uRampMeta0_.w) * 0.5f), _e738.uRamp0_.y));
                                let _e743 = uniforms;
                                let _e748 = uniforms;
                                let _e751 = uniforms;
                                let _e757 = uniforms;
                                (*extent_4) = vec3<f32>((_e743.uRamp0_.z * 0.5f), ((_e748.uRampMeta0_.x - _e751.uRampMeta0_.w) * 0.5f), (_e757.uRamp0_.w * 0.5f));
                                (*seed) = 21f;
                            }
                        }
                    }
                }
                let _e765 = includeCandidate(1922f);
                let _e766 = uniforms;
                if (_e765 && (_e766.uRamp1_.z > 0.001f)) {
                    {
                        let _e772 = p_53;
                        let _e773 = uniforms;
                        let _e775 = uniforms;
                        let _e777 = rampObj(_e772, _e773.uRamp1_, _e775.uRampMeta1_);
                        d_10 = abs(_e777.x);
                        let _e780 = d_10;
                        let _e781 = best;
                        if (_e780 < _e781) {
                            {
                                let _e783 = d_10;
                                best = _e783;
                                let _e784 = p_53;
                                let _e785 = uniforms;
                                let _e788 = uniforms;
                                let _e791 = uniforms;
                                let _e797 = uniforms;
                                (*q_6) = (_e784 - vec3<f32>(_e785.uRamp1_.x, ((_e788.uRampMeta1_.x + _e791.uRampMeta1_.w) * 0.5f), _e797.uRamp1_.y));
                                let _e802 = uniforms;
                                let _e807 = uniforms;
                                let _e810 = uniforms;
                                let _e816 = uniforms;
                                (*extent_4) = vec3<f32>((_e802.uRamp1_.z * 0.5f), ((_e807.uRampMeta1_.x - _e810.uRampMeta1_.w) * 0.5f), (_e816.uRamp1_.w * 0.5f));
                                (*seed) = 22f;
                            }
                        }
                    }
                }
                let _e824 = includeCandidate(1923f);
                let _e825 = uniforms;
                if (_e824 && (_e825.uRamp2_.z > 0.001f)) {
                    {
                        let _e831 = p_53;
                        let _e832 = uniforms;
                        let _e834 = uniforms;
                        let _e836 = rampObj(_e831, _e832.uRamp2_, _e834.uRampMeta2_);
                        d_10 = abs(_e836.x);
                        let _e839 = d_10;
                        let _e840 = best;
                        if (_e839 < _e840) {
                            {
                                let _e842 = d_10;
                                best = _e842;
                                let _e843 = p_53;
                                let _e844 = uniforms;
                                let _e847 = uniforms;
                                let _e850 = uniforms;
                                let _e856 = uniforms;
                                (*q_6) = (_e843 - vec3<f32>(_e844.uRamp2_.x, ((_e847.uRampMeta2_.x + _e850.uRampMeta2_.w) * 0.5f), _e856.uRamp2_.y));
                                let _e861 = uniforms;
                                let _e866 = uniforms;
                                let _e869 = uniforms;
                                let _e875 = uniforms;
                                (*extent_4) = vec3<f32>((_e861.uRamp2_.z * 0.5f), ((_e866.uRampMeta2_.x - _e869.uRampMeta2_.w) * 0.5f), (_e875.uRamp2_.w * 0.5f));
                                (*seed) = 23f;
                                return;
                            }
                        } else {
                            return;
                        }
                    }
                } else {
                    return;
                }
            }
        } else {
            let _e882 = m_1;
            let _e885 = m_1;
            let _e889 = m_1;
            let _e892 = m_1;
            if (((_e882 > 15.5f) && (_e885 < 18.5f)) || ((_e889 > 19.5f) && (_e892 < 20.5f))) {
                {
                    loop {
                        let _e899 = i_7;
                        if !((_e899 < 8i)) {
                            break;
                        }
                        {
                            let _e906 = i_7;
                            slot_2 = f32(_e906);
                            let _e910 = slot_2;
                            instance = (31f + _e910);
                            let _e917 = slot_2;
                            zoneSlot(_e917, (&zone_1), (&shape_9), (&basis_9), (&motion_7));
                            let _e927 = zone_1;
                            let _e932 = instance;
                            let _e934 = includeCandidate((((15f + _e927.w) * 100f) + _e932));
                            let _e935 = zone_1;
                            let _e941 = zone_1;
                            let _e944 = m_1;
                            if ((_e934 && (_e935.w > 0.5f)) && (abs(((15f + _e941.w) - _e944)) < 0.25f)) {
                                {
                                    let _e950 = p_53;
                                    let _e951 = zone_1;
                                    let _e952 = shape_9;
                                    let _e953 = basis_9;
                                    let _e954 = motion_7;
                                    let _e955 = zoneObj(_e950, _e951, _e952, _e953, _e954);
                                    d_10 = abs(_e955.x);
                                    let _e958 = d_10;
                                    let _e959 = best;
                                    if (_e958 < _e959) {
                                        {
                                            let _e961 = d_10;
                                            best = _e961;
                                            let _e962 = p_53;
                                            let _e963 = zone_1;
                                            let _e966 = motion_7;
                                            let _e967 = zone_1;
                                            let _e969 = zoneBase(_e966, _e967.w);
                                            let _e971 = zone_1;
                                            (*q_6) = (_e962 - vec3<f32>(_e963.x, (0.016f + _e969), _e971.y));
                                            let _e975 = zone_1;
                                            let _e976 = shape_9;
                                            let _e977 = zoneDimensions(_e975, _e976);
                                            size_1 = _e977;
                                            let _e979 = size_1;
                                            let _e982 = size_1;
                                            (*extent_4) = vec3<f32>(_e979.x, 0.012f, _e982.y);
                                            let _e985 = instance;
                                            (*seed) = _e985;
                                        }
                                    }
                                }
                            }
                        }
                        continuing {
                            let _e903 = i_7;
                            i_7 = (_e903 + 1i);
                        }
                    }
                    return;
                }
            } else {
                let _e986 = m_1;
                if (_e986 > 21.5f) {
                    {
                        let _e990 = includeCandidate(2241f);
                        let _e991 = uniforms;
                        if (_e990 && (_e991.uBump0_.z > 0.01f)) {
                            {
                                let _e997 = p_53;
                                let _e998 = uniforms;
                                let _e1000 = uniforms;
                                let _e1002 = uniforms;
                                let _e1004 = bumperObj(_e997, _e998.uBump0_, _e1000.uBumpFx0_, _e1002.uBumpWarp0_);
                                d_10 = abs(_e1004.x);
                                let _e1007 = d_10;
                                let _e1008 = best;
                                if (_e1007 < _e1008) {
                                    {
                                        let _e1010 = d_10;
                                        best = _e1010;
                                        let _e1011 = uniforms;
                                        h_7 = max(_e1011.uBump0_.w, 0.34f);
                                        let _e1017 = p_53;
                                        let _e1018 = uniforms;
                                        let _e1021 = h_7;
                                        let _e1024 = uniforms;
                                        (*q_6) = (_e1017 - vec3<f32>(_e1018.uBump0_.x, (_e1021 * 0.5f), _e1024.uBump0_.y));
                                        let _e1029 = uniforms;
                                        let _e1032 = h_7;
                                        let _e1035 = uniforms;
                                        (*extent_4) = vec3<f32>(_e1029.uBump0_.z, (_e1032 * 0.5f), _e1035.uBump0_.z);
                                        (*seed) = 41f;
                                    }
                                }
                            }
                        }
                        let _e1041 = includeCandidate(2242f);
                        let _e1042 = uniforms;
                        if (_e1041 && (_e1042.uBump1_.z > 0.01f)) {
                            {
                                let _e1048 = p_53;
                                let _e1049 = uniforms;
                                let _e1051 = uniforms;
                                let _e1053 = uniforms;
                                let _e1055 = bumperObj(_e1048, _e1049.uBump1_, _e1051.uBumpFx1_, _e1053.uBumpWarp1_);
                                d_10 = abs(_e1055.x);
                                let _e1058 = d_10;
                                let _e1059 = best;
                                if (_e1058 < _e1059) {
                                    {
                                        let _e1061 = d_10;
                                        best = _e1061;
                                        let _e1062 = uniforms;
                                        h_8 = max(_e1062.uBump1_.w, 0.34f);
                                        let _e1068 = p_53;
                                        let _e1069 = uniforms;
                                        let _e1072 = h_8;
                                        let _e1075 = uniforms;
                                        (*q_6) = (_e1068 - vec3<f32>(_e1069.uBump1_.x, (_e1072 * 0.5f), _e1075.uBump1_.y));
                                        let _e1080 = uniforms;
                                        let _e1083 = h_8;
                                        let _e1086 = uniforms;
                                        (*extent_4) = vec3<f32>(_e1080.uBump1_.z, (_e1083 * 0.5f), _e1086.uBump1_.z);
                                        (*seed) = 42f;
                                    }
                                }
                            }
                        }
                        let _e1092 = includeCandidate(2243f);
                        let _e1093 = uniforms;
                        if (_e1092 && (_e1093.uBump2_.z > 0.01f)) {
                            {
                                let _e1099 = p_53;
                                let _e1100 = uniforms;
                                let _e1102 = uniforms;
                                let _e1104 = uniforms;
                                let _e1106 = bumperObj(_e1099, _e1100.uBump2_, _e1102.uBumpFx2_, _e1104.uBumpWarp2_);
                                d_10 = abs(_e1106.x);
                                let _e1109 = d_10;
                                let _e1110 = best;
                                if (_e1109 < _e1110) {
                                    {
                                        let _e1112 = d_10;
                                        best = _e1112;
                                        let _e1113 = uniforms;
                                        h_9 = max(_e1113.uBump2_.w, 0.34f);
                                        let _e1119 = p_53;
                                        let _e1120 = uniforms;
                                        let _e1123 = h_9;
                                        let _e1126 = uniforms;
                                        (*q_6) = (_e1119 - vec3<f32>(_e1120.uBump2_.x, (_e1123 * 0.5f), _e1126.uBump2_.y));
                                        let _e1131 = uniforms;
                                        let _e1134 = h_9;
                                        let _e1137 = uniforms;
                                        (*extent_4) = vec3<f32>(_e1131.uBump2_.z, (_e1134 * 0.5f), _e1137.uBump2_.z);
                                        (*seed) = 43f;
                                        return;
                                    }
                                } else {
                                    return;
                                }
                            }
                        } else {
                            return;
                        }
                    }
                } else {
                    let _e1142 = m_1;
                    let _e1145 = m_1;
                    if ((_e1142 > 9.5f) && (_e1145 < 12.5f)) {
                        {
                            let _e1149 = p_53;
                            let _e1150 = uniforms;
                            let _e1155 = uniforms;
                            let _e1159 = uniforms;
                            (*q_6) = (_e1149 - vec3<f32>(_e1150.uTarget.x, (0.035f + _e1155.uTargetY.x), _e1159.uTarget.y));
                            (*extent_4) = vec3<f32>(0.49f, 0.02f, 0.49f);
                            return;
                        }
                    } else {
                        let _e1169 = m_1;
                        let _e1172 = m_1;
                        if ((_e1169 > 14.5f) && (_e1172 < 15.5f)) {
                            {
                                let _e1176 = p_53;
                                if (_e1176.z < -3.09f) {
                                    {
                                        let _e1181 = p_53;
                                        let _e1182 = uniforms;
                                        let _e1187 = uniforms;
                                        (*q_6) = (_e1181 - vec3<f32>(_e1182.uTarget.x, (0.74f + _e1187.uTargetY.x), -3.185f));
                                        (*extent_4) = vec3<f32>(0.58f, 0.7f, 0.03f);
                                        return;
                                    }
                                } else {
                                    {
                                        let _e1199 = p_53;
                                        let _e1200 = uniforms;
                                        let _e1205 = uniforms;
                                        let _e1209 = uniforms;
                                        (*q_6) = (_e1199 - vec3<f32>(_e1200.uTarget.x, (0.03f + _e1205.uTargetY.x), _e1209.uTarget.y));
                                        (*extent_4) = vec3<f32>(0.515f, 0.018f, 0.515f);
                                        return;
                                    }
                                }
                            }
                        } else {
                            return;
                        }
                    }
                }
            }
        }
    }
}

fn zoneFlow(seed_1: f32) -> vec4<f32> {
    var seed_2: f32;

    seed_2 = seed_1;
    let _e203 = uniforms;
    let _e207 = seed_2;
    let _e214 = uniforms;
    let _e218 = seed_2;
    let _e226 = uniforms;
    let _e230 = seed_2;
    let _e238 = uniforms;
    let _e242 = seed_2;
    let _e250 = uniforms;
    let _e254 = seed_2;
    let _e262 = uniforms;
    let _e266 = seed_2;
    let _e274 = uniforms;
    let _e278 = seed_2;
    let _e286 = uniforms;
    let _e290 = seed_2;
    return ((((((((_e203.uZoneFlow0_ * (1f - step(0.5f, abs((_e207 - 31f))))) + (_e214.uZoneFlow1_ * (1f - step(0.5f, abs((_e218 - 32f)))))) + (_e226.uZoneFlow2_ * (1f - step(0.5f, abs((_e230 - 33f)))))) + (_e238.uZoneFlow3_ * (1f - step(0.5f, abs((_e242 - 34f)))))) + (_e250.uZoneFlow4_ * (1f - step(0.5f, abs((_e254 - 35f)))))) + (_e262.uZoneFlow5_ * (1f - step(0.5f, abs((_e266 - 36f)))))) + (_e274.uZoneFlow6_ * (1f - step(0.5f, abs((_e278 - 37f)))))) + (_e286.uZoneFlow7_ * (1f - step(0.5f, abs((_e290 - 38f))))));
}

fn zoneShapeAt(seed_3: f32) -> vec4<f32> {
    var seed_4: f32;

    seed_4 = seed_3;
    let _e203 = uniforms;
    let _e207 = seed_4;
    let _e214 = uniforms;
    let _e218 = seed_4;
    let _e226 = uniforms;
    let _e230 = seed_4;
    let _e238 = uniforms;
    let _e242 = seed_4;
    let _e250 = uniforms;
    let _e254 = seed_4;
    let _e262 = uniforms;
    let _e266 = seed_4;
    let _e274 = uniforms;
    let _e278 = seed_4;
    let _e286 = uniforms;
    let _e290 = seed_4;
    return ((((((((_e203.uZoneShape0_ * (1f - step(0.5f, abs((_e207 - 31f))))) + (_e214.uZoneShape1_ * (1f - step(0.5f, abs((_e218 - 32f)))))) + (_e226.uZoneShape2_ * (1f - step(0.5f, abs((_e230 - 33f)))))) + (_e238.uZoneShape3_ * (1f - step(0.5f, abs((_e242 - 34f)))))) + (_e250.uZoneShape4_ * (1f - step(0.5f, abs((_e254 - 35f)))))) + (_e262.uZoneShape5_ * (1f - step(0.5f, abs((_e266 - 36f)))))) + (_e274.uZoneShape6_ * (1f - step(0.5f, abs((_e278 - 37f)))))) + (_e286.uZoneShape7_ * (1f - step(0.5f, abs((_e290 - 38f))))));
}

fn zoneBasisAt(seed_5: f32) -> vec4<f32> {
    var seed_6: f32;

    seed_6 = seed_5;
    let _e203 = uniforms;
    let _e207 = seed_6;
    let _e214 = uniforms;
    let _e218 = seed_6;
    let _e226 = uniforms;
    let _e230 = seed_6;
    let _e238 = uniforms;
    let _e242 = seed_6;
    let _e250 = uniforms;
    let _e254 = seed_6;
    let _e262 = uniforms;
    let _e266 = seed_6;
    let _e274 = uniforms;
    let _e278 = seed_6;
    let _e286 = uniforms;
    let _e290 = seed_6;
    return ((((((((_e203.uZoneBasis0_ * (1f - step(0.5f, abs((_e207 - 31f))))) + (_e214.uZoneBasis1_ * (1f - step(0.5f, abs((_e218 - 32f)))))) + (_e226.uZoneBasis2_ * (1f - step(0.5f, abs((_e230 - 33f)))))) + (_e238.uZoneBasis3_ * (1f - step(0.5f, abs((_e242 - 34f)))))) + (_e250.uZoneBasis4_ * (1f - step(0.5f, abs((_e254 - 35f)))))) + (_e262.uZoneBasis5_ * (1f - step(0.5f, abs((_e266 - 36f)))))) + (_e274.uZoneBasis6_ * (1f - step(0.5f, abs((_e278 - 37f)))))) + (_e286.uZoneBasis7_ * (1f - step(0.5f, abs((_e290 - 38f))))));
}

fn zoneMotionAt(seed_7: f32) -> vec4<f32> {
    var seed_8: f32;

    seed_8 = seed_7;
    let _e203 = uniforms;
    let _e207 = seed_8;
    let _e214 = uniforms;
    let _e218 = seed_8;
    let _e226 = uniforms;
    let _e230 = seed_8;
    let _e238 = uniforms;
    let _e242 = seed_8;
    let _e250 = uniforms;
    let _e254 = seed_8;
    let _e262 = uniforms;
    let _e266 = seed_8;
    let _e274 = uniforms;
    let _e278 = seed_8;
    let _e286 = uniforms;
    let _e290 = seed_8;
    return ((((((((_e203.uZoneMotion0_ * (1f - step(0.5f, abs((_e207 - 31f))))) + (_e214.uZoneMotion1_ * (1f - step(0.5f, abs((_e218 - 32f)))))) + (_e226.uZoneMotion2_ * (1f - step(0.5f, abs((_e230 - 33f)))))) + (_e238.uZoneMotion3_ * (1f - step(0.5f, abs((_e242 - 34f)))))) + (_e250.uZoneMotion4_ * (1f - step(0.5f, abs((_e254 - 35f)))))) + (_e262.uZoneMotion5_ * (1f - step(0.5f, abs((_e266 - 36f)))))) + (_e274.uZoneMotion6_ * (1f - step(0.5f, abs((_e278 - 37f)))))) + (_e286.uZoneMotion7_ * (1f - step(0.5f, abs((_e290 - 38f))))));
}

fn zoneEdgeInfo(p_54: vec2<f32>, extent_5: vec3<f32>, seed_9: f32) -> vec3<f32> {
    var p_55: vec2<f32>;
    var extent_6: vec3<f32>;
    var seed_10: f32;
    var authored: vec4<f32>;
    var shape_10: vec3<f32>;
    var basis_10: vec2<f32>;
    var local_18: vec2<f32>;
    var d_11: vec2<f32>;
    var positive: vec2<f32>;
    var cornerNormal: vec2<f32>;
    var faceNormal: vec2<f32>;
    var normal: vec2<f32>;

    p_55 = p_54;
    extent_6 = extent_5;
    seed_10 = seed_9;
    let _e207 = seed_10;
    let _e208 = zoneShapeAt(_e207);
    authored = _e208;
    let _e212 = extent_6;
    let _e219 = authored;
    let _e220 = zoneDimensions(vec4<f32>(0f, 0f, _e212.x, 0f), _e219);
    shape_10 = _e220;
    let _e222 = seed_10;
    let _e223 = zoneBasisAt(_e222);
    let _e224 = zoneRotation(_e223);
    basis_10 = _e224;
    let _e226 = p_55;
    let _e227 = basis_10;
    let _e228 = zoneLocal(_e226, _e227);
    local_18 = _e228;
    let _e230 = local_18;
    let _e232 = shape_10;
    let _e235 = shape_10;
    d_11 = ((abs(_e230) - _e232.xy) + vec2(_e235.z));
    let _e240 = d_11;
    positive = max(_e240, vec2(0f));
    let _e245 = positive;
    let _e246 = positive;
    cornerNormal = (_e245 / vec2(max(length(_e246), 0.0001f)));
    let _e263 = d_11;
    let _e265 = d_11;
    faceNormal = mix(vec2<f32>(0f, 1f), vec2<f32>(1f, 0f), vec2(step(_e263.y, _e265.x)));
    let _e271 = faceNormal;
    let _e272 = cornerNormal;
    let _e274 = positive;
    let _e275 = positive;
    let _e280 = local_18;
    normal = (mix(_e271, _e272, vec2(step(0.00001f, dot(_e274, _e275)))) * sign(_e280));
    let _e284 = local_18;
    let _e285 = shape_10;
    let _e286 = sdZoneFootprint(_e284, _e285);
    let _e288 = basis_10;
    let _e290 = normal;
    let _e293 = basis_10;
    let _e295 = normal;
    let _e299 = basis_10;
    let _e301 = normal;
    let _e304 = basis_10;
    let _e306 = normal;
    return vec3<f32>(-(_e286), ((_e288.x * _e290.x) - (_e293.y * _e295.y)), ((_e299.y * _e301.x) + (_e304.x * _e306.y)));
}

fn jellyState(seed_11: f32) -> vec4<f32> {
    var seed_12: f32;
    var local_19: vec4<f32>;
    var local_20: vec4<f32>;

    seed_12 = seed_11;
    let _e203 = seed_12;
    if (_e203 < 41.5f) {
        let _e206 = uniforms;
        local_20 = _e206.uBumpFx0_;
    } else {
        let _e208 = seed_12;
        if (_e208 < 42.5f) {
            let _e211 = uniforms;
            local_19 = _e211.uBumpFx1_;
        } else {
            let _e213 = uniforms;
            local_19 = _e213.uBumpFx2_;
        }
        let _e216 = local_19;
        local_20 = _e216;
    }
    let _e218 = local_20;
    return _e218;
}

fn jellyWarp(seed_13: f32) -> vec4<f32> {
    var seed_14: f32;
    var local_21: vec4<f32>;
    var local_22: vec4<f32>;

    seed_14 = seed_13;
    let _e203 = seed_14;
    if (_e203 < 41.5f) {
        let _e206 = uniforms;
        local_22 = _e206.uBumpWarp0_;
    } else {
        let _e208 = seed_14;
        if (_e208 < 42.5f) {
            let _e211 = uniforms;
            local_21 = _e211.uBumpWarp1_;
        } else {
            let _e213 = uniforms;
            local_21 = _e213.uBumpWarp2_;
        }
        let _e216 = local_21;
        local_22 = _e216;
    }
    let _e218 = local_22;
    return _e218;
}

fn woodRingFilter(phase: f32, frequency_10: f32, duty_3: f32) -> f32 {
    var phase_1: f32;
    var frequency_11: f32;
    var duty_4: f32;
    var span_2: f32;
    var x_3: f32;

    phase_1 = phase;
    frequency_11 = frequency_10;
    duty_4 = duty_3;
    let _e207 = gFootprint;
    let _e208 = frequency_11;
    span_2 = max((_e207 * _e208), 0.002f);
    let _e213 = span_2;
    if (_e213 >= 1f) {
        let _e216 = duty_4;
        return _e216;
    }
    let _e217 = phase_1;
    let _e218 = duty_4;
    x_3 = (_e217 + (_e218 * 0.5f));
    let _e223 = x_3;
    let _e224 = span_2;
    let _e228 = duty_4;
    let _e229 = stripeIntegral((_e223 + (_e224 * 0.5f)), _e228);
    let _e230 = x_3;
    let _e231 = span_2;
    let _e235 = duty_4;
    let _e236 = stripeIntegral((_e230 - (_e231 * 0.5f)), _e235);
    let _e238 = span_2;
    return clamp(((_e229 - _e236) / _e238), 0f, 1f);
}

fn woodBoardCoordinates(uv_3: vec2<f32>, local_23: ptr<function, vec2<f32>>, boardId: ptr<function, vec2<f32>>) {
    var uv_4: vec2<f32>;
    var row: f32;
    var offset: f32;
    var along_1: f32;

    uv_4 = uv_3;
    let _e205 = uv_4;
    row = floor(((_e205.x + 3.25f) / 0.22f));
    let _e213 = row;
    let _e216 = hash(vec2<f32>(_e213, 2.7f));
    offset = _e216;
    let _e218 = uv_4;
    let _e224 = offset;
    along_1 = (((_e218.y + 3.25f) / 1.65f) + _e224);
    let _e227 = row;
    let _e228 = along_1;
    (*boardId) = vec2<f32>(_e227, floor(_e228));
    let _e231 = uv_4;
    let _e242 = along_1;
    (*local_23) = vec2<f32>(((fract(((_e231.x + 3.25f) / 0.22f)) - 0.5f) * 0.22f), ((fract(_e242) - 0.5f) * 1.65f));
    let _e250 = (*local_23);
    let _e256 = (*boardId);
    let _e261 = hash((_e256 + vec2<f32>(7f, 3f)));
    (*local_23).y = (_e250.y * mix(-1f, 1f, step(0.5f, _e261)));
    return;
}

fn woodAnatomy(uv_5: vec2<f32>, identity: f32, slope_1: ptr<function, vec2<f32>>) -> vec4<f32> {
    var uv_6: vec2<f32>;
    var identity_1: f32;
    var offset_1: vec2<f32>;
    var warp_4: vec3<f32>;
    var crossGrain: f32;
    var taper: f32;
    var radius_2: f32;
    var frequency_12: f32;
    var phase_2: f32;
    var latewood: f32;
    var broad: f32;
    var fibre: f32 = 0f;
    var pores: f32 = 0f;
    var fibres: vec3<f32>;

    uv_6 = uv_5;
    identity_1 = identity;
    let _e206 = identity_1;
    let _e209 = identity_1;
    offset_1 = vec2<f32>((_e206 * 13.7f), (_e209 * 5.3f));
    let _e214 = uv_6;
    let _e219 = offset_1;
    let _e222 = materialNoise(((_e214 * vec2<f32>(2.2f, 0.72f)) + _e219), 2.2f);
    warp_4 = _e222;
    let _e224 = uv_6;
    let _e226 = warp_4;
    let _e233 = identity_1;
    crossGrain = ((_e224.x + ((_e226.x - 0.5f) * 0.045f)) + ((_e233 - 0.5f) * 0.36f));
    let _e242 = identity_1;
    let _e246 = uv_6;
    let _e250 = identity_1;
    let _e253 = uv_6;
    let _e257 = identity_1;
    taper = ((0.085f + (0.16f * _e242)) + ((0.13f * ((_e246.y + 0.55f) - _e250)) * ((_e253.y + 0.55f) - _e257)));
    let _e262 = crossGrain;
    let _e263 = crossGrain;
    let _e265 = taper;
    let _e266 = taper;
    radius_2 = sqrt(((_e262 * _e263) + (_e265 * _e266)));
    let _e272 = identity_1;
    frequency_12 = (160f + (_e272 * 70f));
    let _e277 = radius_2;
    let _e278 = frequency_12;
    let _e280 = identity_1;
    let _e284 = warp_4;
    phase_2 = (((_e277 * _e278) + (_e280 * 7f)) + ((_e284.x - 0.5f) * 0.35f));
    let _e292 = phase_2;
    let _e293 = frequency_12;
    let _e297 = woodRingFilter(_e292, (_e293 * 1.6f), 0.19f);
    latewood = _e297;
    let _e299 = uv_6;
    let _e304 = offset_1;
    let _e310 = materialNoise((((_e299 * vec2<f32>(3.1f, 0.85f)) + _e304) + vec2(4.7f)), 3.1f);
    broad = (_e310.x - 0.5f);
    (*slope_1) = vec2(0f);
    let _e322 = crossGrain;
    let _e325 = uv_6;
    let _e330 = offset_1;
    let _e333 = materialNoise((vec2<f32>((_e322 * 83f), (_e325.y * 5.5f)) + _e330), 88f);
    fibres = _e333;
    let _e335 = fibres;
    fibre = (_e335.x - 0.5f);
    let _e339 = fibres;
    (*slope_1) = (_e339.yz * vec2<f32>(0.013f, 0.004f));
    let _e345 = latewood;
    let _e346 = fibre;
    let _e347 = pores;
    let _e348 = broad;
    return vec4<f32>(_e345, _e346, _e347, _e348);
}

fn colorVertex(cell: vec3<f32>, seed_15: f32) -> vec4<f32> {
    var cell_1: vec3<f32>;
    var seed_16: f32;
    var value: f32;
    var dirt: f32;

    cell_1 = cell;
    seed_16 = seed_15;
    let _e205 = cell_1;
    let _e207 = cell_1;
    let _e212 = cell_1;
    let _e214 = seed_16;
    let _e219 = hash(vec2<f32>((_e205.x + (_e207.z * 17f)), (_e212.y + (_e214 * 7f))));
    value = _e219;
    let _e221 = cell_1;
    let _e223 = cell_1;
    let _e230 = cell_1;
    let _e232 = seed_16;
    let _e237 = hash(vec2<f32>(((_e221.z + (_e223.y * 11f)) + 3.2f), (_e230.x + (_e232 * 13f))));
    dirt = _e237;
    let _e247 = value;
    let _e249 = mix(vec3<f32>(0.83f, 0.85f, 0.87f), vec3<f32>(1f, 0.985f, 0.95f), vec3(_e247));
    let _e250 = dirt;
    return vec4<f32>(_e249.x, _e249.y, _e249.z, _e250);
}

fn materialVertexColor(m_2: f32, q_7: vec3<f32>, extent_7: vec3<f32>, seed_17: f32) -> vec4<f32> {
    var m_3: f32;
    var q_8: vec3<f32>;
    var extent_8: vec3<f32>;
    var seed_18: f32;
    var local_24: f32;
    var grid: vec3<f32>;
    var cell_2: vec3<f32>;
    var f_3: vec3<f32>;
    var a_7: vec4<f32>;
    var b_10: vec4<f32>;
    var c_1: vec4<f32>;
    var d_12: vec4<f32>;

    m_3 = m_2;
    q_8 = q_7;
    extent_8 = extent_7;
    seed_18 = seed_17;
    let _e209 = m_3;
    let _e212 = m_3;
    let _e216 = m_3;
    let _e219 = m_3;
    let _e224 = m_3;
    let _e227 = m_3;
    if ((((_e209 > 9.5f) && (_e212 < 13.5f)) || ((_e216 > 14.5f) && (_e219 < 18.5f))) || ((_e224 > 19.5f) && (_e227 < 20.5f))) {
        return vec4<f32>(1f, 1f, 1f, 0f);
    }
    let _e241 = q_8;
    let _e242 = m_3;
    let _e245 = m_3;
    if ((_e242 > 6.5f) && (_e245 < 7.5f)) {
        local_24 = 0.28f;
    } else {
        local_24 = 0.72f;
    }
    let _e252 = local_24;
    grid = (_e241 / vec3(_e252));
    let _e256 = grid;
    cell_2 = floor(_e256);
    let _e259 = grid;
    f_3 = fract(_e259);
    let _e262 = cell_2;
    let _e263 = seed_18;
    let _e264 = colorVertex(_e262, _e263);
    let _e265 = cell_2;
    let _e274 = seed_18;
    let _e275 = colorVertex((_e265 + vec3<f32>(1f, 0f, 0f)), _e274);
    let _e276 = f_3;
    a_7 = mix(_e264, _e275, vec4(_e276.x));
    let _e281 = cell_2;
    let _e290 = seed_18;
    let _e291 = colorVertex((_e281 + vec3<f32>(0f, 1f, 0f)), _e290);
    let _e292 = cell_2;
    let _e301 = seed_18;
    let _e302 = colorVertex((_e292 + vec3<f32>(1f, 1f, 0f)), _e301);
    let _e303 = f_3;
    b_10 = mix(_e291, _e302, vec4(_e303.x));
    let _e308 = cell_2;
    let _e317 = seed_18;
    let _e318 = colorVertex((_e308 + vec3<f32>(0f, 0f, 1f)), _e317);
    let _e319 = cell_2;
    let _e328 = seed_18;
    let _e329 = colorVertex((_e319 + vec3<f32>(1f, 0f, 1f)), _e328);
    let _e330 = f_3;
    c_1 = mix(_e318, _e329, vec4(_e330.x));
    let _e335 = cell_2;
    let _e344 = seed_18;
    let _e345 = colorVertex((_e335 + vec3<f32>(0f, 1f, 1f)), _e344);
    let _e346 = cell_2;
    let _e355 = seed_18;
    let _e356 = colorVertex((_e346 + vec3<f32>(1f, 1f, 1f)), _e355);
    let _e357 = f_3;
    d_12 = mix(_e345, _e356, vec4(_e357.x));
    let _e362 = a_7;
    let _e363 = b_10;
    let _e364 = f_3;
    let _e368 = c_1;
    let _e369 = d_12;
    let _e370 = f_3;
    let _e374 = f_3;
    return mix(mix(_e362, _e363, vec4(_e364.y)), mix(_e368, _e369, vec4(_e370.y)), vec4(_e374.z));
}

fn reliefDepth(m_4: f32) -> f32 {
    var m_5: f32;

    m_5 = m_4;
    let _e203 = m_5;
    if (_e203 < 1.5f) {
        return 0.009f;
    }
    let _e207 = m_5;
    if (_e207 < 2.5f) {
        return 0.0035f;
    }
    let _e211 = m_5;
    if (_e211 < 6.5f) {
        return 0.0025f;
    }
    let _e215 = m_5;
    if (_e215 < 7.5f) {
        return 0.0024f;
    }
    let _e219 = m_5;
    if (_e219 < 8.5f) {
        return 0.003f;
    }
    let _e223 = m_5;
    let _e226 = m_5;
    if ((_e223 > 13.5f) && (_e226 < 14.5f)) {
        return 0.0015f;
    }
    let _e231 = m_5;
    let _e234 = m_5;
    if ((_e231 > 18.5f) && (_e234 < 19.5f)) {
        return 0.007f;
    }
    return 0f;
}

fn reliefWeight(frequency_13: f32) -> f32 {
    var frequency_14: f32;

    frequency_14 = frequency_13;
    let _e206 = gReliefFootprint;
    let _e207 = frequency_14;
    return (1f - smoothstep(0.16f, 0.65f, (_e206 * _e207)));
}

fn reliefNoise(p_56: vec2<f32>, frequency_15: f32) -> f32 {
    var p_57: vec2<f32>;
    var frequency_16: f32;
    var f_4: vec2<f32>;
    var u_2: vec2<f32>;
    var value_1: f32;

    p_57 = p_56;
    frequency_16 = frequency_15;
    let _e205 = p_57;
    f_4 = fract(_e205);
    let _e208 = f_4;
    let _e209 = f_4;
    let _e211 = f_4;
    let _e213 = f_4;
    let _e214 = f_4;
    u_2 = (((_e208 * _e209) * _e211) * ((_e213 * ((_e214 * 6f) - vec2(15f))) + vec2(10f)));
    let _e226 = p_57;
    let _e227 = floor(_e226);
    const _e229 = vec2(251f);
    let _e237 = u_2;
    let _e243 = textureSampleLevel(uReliefNoiseTexture, uReliefNoiseSampler, ((((_e227 - (floor((_e227 / _e229)) * _e229)) + vec2(0.5f)) + _e237) / vec2(256f)), 0f);
    value_1 = _e243.x;
    let _e247 = value_1;
    let _e248 = frequency_16;
    let _e249 = reliefWeight(_e248);
    return mix(0.5f, _e247, _e249);
}

fn surfaceInset(m_6: f32, q_9: vec3<f32>, extent_9: vec3<f32>, seed_19: f32) -> f32 {
    var m_7: f32;
    var q_10: vec3<f32>;
    var extent_10: vec3<f32>;
    var seed_20: f32;
    var depth_1: f32;
    var h_10: f32;
    var local_25: vec2<f32>;
    var id: vec2<f32>;
    var offset_2: f32;
    var joint: f32;
    var fibre_1: f32;
    var yarn: f32;
    var local_26: vec3<f32>;
    var grain: vec3<f32>;
    var local_27: f32;
    var local_28: f32;
    var frequency_17: f32;

    m_7 = m_6;
    q_10 = q_9;
    extent_10 = extent_9;
    seed_20 = seed_19;
    let _e209 = m_7;
    let _e210 = reliefDepth(_e209);
    depth_1 = _e210;
    let _e212 = depth_1;
    if (_e212 == 0f) {
        return 0f;
    }
    let _e217 = m_7;
    if (_e217 < 1.5f) {
        {
            let _e222 = q_10;
            woodBoardCoordinates(_e222.xz, (&local_25), (&id));
            let _e228 = id;
            let _e232 = hash(vec2<f32>(_e228.x, 2.7f));
            offset_2 = _e232;
            let _e234 = q_10;
            let _e240 = gReliefFootprint;
            let _e241 = stripeCoverage((_e234.x + 3.25f), 0.22f, 0.002f, _e240);
            let _e242 = q_10;
            let _e246 = offset_2;
            let _e252 = gReliefFootprint;
            let _e253 = stripeCoverage(((_e242.z + 3.25f) + (_e246 * 1.65f)), 1.65f, 0.002f, _e252);
            joint = max(_e241, _e253);
            let _e256 = local_25;
            let _e261 = id;
            let _e262 = hash(_e261);
            let _e268 = reliefNoise(((_e256 * vec2<f32>(65f, 4f)) + vec2((_e262 * 7f))), 65f);
            fibre_1 = _e268;
            let _e272 = fibre_1;
            let _e276 = joint;
            h_10 = ((0.12f + (0.26f * _e272)) + (0.62f * _e276));
        }
    } else {
        let _e279 = m_7;
        if (_e279 < 2.5f) {
            {
                let _e284 = q_10;
                let _e290 = q_10;
                yarn = (0.5f + ((0.5f * sin((_e284.x * 440f))) * sin((_e290.z * 360f))));
                let _e301 = yarn;
                let _e303 = reliefWeight(70f);
                h_10 = (0.2f + (0.8f * mix(0.5f, _e301, _e303)));
            }
        } else {
            let _e307 = m_7;
            let _e310 = m_7;
            if ((_e307 > 18.5f) && (_e310 < 19.5f)) {
                {
                    let _e314 = extent_10;
                    let _e316 = extent_10;
                    if (_e314.z >= _e316.x) {
                        let _e319 = q_10;
                        local_26 = _e319;
                    } else {
                        let _e320 = q_10;
                        local_26 = _e320.zyx;
                    }
                    let _e323 = local_26;
                    grain = _e323;
                    let _e327 = grain;
                    let _e331 = grain;
                    let _e336 = grain;
                    let _e341 = seed_20;
                    let _e345 = reliefNoise((vec2<f32>(((_e327.x * 42f) + (_e331.y * 31f)), (_e336.z * 4f)) + vec2(_e341)), 52f);
                    h_10 = (0.22f + (0.78f * _e345));
                }
            } else {
                {
                    let _e348 = m_7;
                    if (_e348 < 6.5f) {
                        local_28 = 38f;
                    } else {
                        let _e352 = m_7;
                        if (_e352 < 8.5f) {
                            local_27 = 27f;
                        } else {
                            local_27 = 34f;
                        }
                        let _e358 = local_27;
                        local_28 = _e358;
                    }
                    let _e360 = local_28;
                    frequency_17 = _e360;
                    let _e364 = q_10;
                    let _e366 = frequency_17;
                    let _e368 = seed_20;
                    let _e371 = frequency_17;
                    let _e372 = reliefNoise(((_e364.xz * _e366) + vec2(_e368)), _e371);
                    let _e373 = q_10;
                    let _e375 = frequency_17;
                    let _e377 = seed_20;
                    let _e383 = frequency_17;
                    let _e384 = reliefNoise((((_e373.xy * _e375) + vec2(_e377)) + vec2(5.7f)), _e383);
                    h_10 = (0.18f + ((0.82f * (_e372 + _e384)) * 0.5f));
                }
            }
        }
    }
    let _e390 = depth_1;
    let _e391 = h_10;
    return (_e390 * clamp(_e391, 0f, 1f));
}

fn reliefCandidate(ro_2: vec3<f32>, rd_4: vec3<f32>, hit: vec2<f32>) -> ReliefCandidate {
    var ro_3: vec3<f32>;
    var rd_5: vec3<f32>;
    var hit_1: vec2<f32>;
    var c_2: ReliefCandidate;
    var p_58: vec3<f32>;
    var q_11: vec3<f32>;
    var e: vec3<f32>;
    var seed_21: f32;
    var center: vec3<f32>;
    var m_8: f32;
    var best_1: f32 = 100f;
    var d_13: f32;
    var origin: vec3<f32> = vec3<f32>(0f, 3.095f, -1.65f);
    var size_2: vec3<f32> = vec3<f32>(1.95f, 0.025f, 0.032f);
    var origin_1: vec3<f32> = vec3<f32>(-1.95f, 3.095f, -0.4f);
    var size_3: vec3<f32> = vec3<f32>(0.032f, 0.025f, 1.3f);
    var origin_2: vec3<f32> = vec3<f32>(1.95f, 3.095f, -0.4f);
    var size_4: vec3<f32> = vec3<f32>(0.032f, 0.025f, 1.3f);
    var best_2: f32 = 100f;
    var d_14: f32;
    var origin_3: vec3<f32> = vec3<f32>(0f, 0.115f, -3.155f);
    var size_5: vec3<f32> = vec3<f32>(3.18f, 0.105f, 0.045f);
    var origin_4: vec3<f32> = vec3<f32>(-3.155f, 0.115f, 0f);
    var size_6: vec3<f32> = vec3<f32>(0.045f, 0.105f, 3.18f);
    var origin_5: vec3<f32> = vec3<f32>(3.155f, 0.115f, 0f);
    var size_7: vec3<f32> = vec3<f32>(0.045f, 0.105f, 3.18f);
    var wall: vec3<f32>;
    var ring: vec3<f32>;
    var shape_11: vec3<f32>;
    var basis_11: vec2<f32>;
    var local_29: f32;
    var local_30: vec4<f32>;
    var local_31: vec4<f32>;
    var meta_6: vec4<f32>;
    var iq_1: vec4<f32>;

    ro_3 = ro_2;
    rd_5 = rd_4;
    hit_1 = hit;
    let _e208 = ro_3;
    let _e209 = rd_5;
    let _e210 = hit_1;
    p_58 = (_e208 + (_e209 * _e210.x));
    let _e218 = hit_1;
    let _e220 = p_58;
    materialCoordinates(_e218.y, _e220, (&q_11), (&e), (&seed_21));
    let _e228 = hit_1;
    c_2.material = _e228.y;
    let _e231 = seed_21;
    c_2.seed = _e231;
    let _e233 = hit_1;
    let _e237 = seed_21;
    c_2.key = ((_e233.y * 100f) + _e237);
    c_2.shape = 1f;
    c_2.radius = 0f;
    c_2.ramp = vec4(0f);
    c_2.warp = vec4(0f);
    let _e251 = p_58;
    let _e252 = q_11;
    center = (_e251 - _e252);
    c_2.pigmentOffset = vec3(0f);
    let _e259 = hit_1;
    m_8 = _e259.y;
    let _e262 = m_8;
    if (_e262 < 1.5f) {
        {
            center = vec3<f32>(0f, -0.055f, 0f);
            e = vec3<f32>(3.25f, 0.055f, 3.25f);
        }
    } else {
        let _e276 = m_8;
        if (_e276 < 2.5f) {
            {
                center = vec3<f32>(0f, 0.005f, 0.78f);
                e = vec3<f32>(2.08f, 0.005f, 1.27f);
                c_2.radius = 0.004f;
            }
        } else {
            let _e290 = m_8;
            if (_e290 < 3.5f) {
                {
                    center = vec3<f32>(0f, 1.58f, -3.23f);
                    e = vec3<f32>(3.25f, 1.62f, 0.045f);
                }
            } else {
                let _e303 = m_8;
                if (_e303 < 4.5f) {
                    {
                        center = vec3<f32>(-3.23f, 1.58f, 0f);
                        e = vec3<f32>(0.045f, 1.62f, 3.25f);
                    }
                } else {
                    let _e316 = m_8;
                    if (_e316 < 5.5f) {
                        {
                            center = vec3<f32>(3.23f, 1.58f, 0f);
                            e = vec3<f32>(0.045f, 1.62f, 3.25f);
                        }
                    } else {
                        let _e328 = m_8;
                        if (_e328 < 6.5f) {
                            {
                                center = vec3<f32>(0f, 3.18f, 0f);
                                e = vec3<f32>(3.25f, 0.045f, 3.25f);
                            }
                        } else {
                            let _e341 = m_8;
                            if (_e341 < 7.5f) {
                                {
                                    let _e344 = cubeCenter();
                                    center = _e344;
                                    let _e347 = cubeScale();
                                    c_2.radius = (0.038f * _e347);
                                }
                            } else {
                                let _e349 = m_8;
                                if (_e349 < 8.5f) {
                                    c_2.radius = 0.045f;
                                } else {
                                    let _e354 = m_8;
                                    let _e357 = m_8;
                                    if ((_e354 > 9.5f) && (_e357 < 11.5f)) {
                                        c_2.shape = 2f;
                                    } else {
                                        let _e363 = m_8;
                                        let _e366 = m_8;
                                        if ((_e363 > 11.5f) && (_e366 < 12.5f)) {
                                            c_2.shape = 4f;
                                        } else {
                                            let _e372 = m_8;
                                            let _e375 = m_8;
                                            if ((_e372 > 12.5f) && (_e375 < 13.5f)) {
                                                {
                                                    c_2.radius = 0.012f;
                                                    {
                                                        let _e396 = p_58;
                                                        let _e397 = origin;
                                                        let _e399 = size_2;
                                                        let _e401 = sdRoundBox((_e396 - _e397), _e399, 0.012f);
                                                        d_13 = _e401;
                                                        let _e403 = includeCandidate(1301f);
                                                        let _e404 = d_13;
                                                        let _e405 = best_1;
                                                        if (_e403 && (_e404 < _e405)) {
                                                            {
                                                                let _e408 = d_13;
                                                                best_1 = _e408;
                                                                let _e409 = origin;
                                                                center = _e409;
                                                                let _e410 = size_2;
                                                                e = _e410;
                                                                c_2.key = 1301f;
                                                            }
                                                        }
                                                    }
                                                    {
                                                        let _e425 = p_58;
                                                        let _e426 = origin_1;
                                                        let _e428 = size_3;
                                                        let _e430 = sdRoundBox((_e425 - _e426), _e428, 0.012f);
                                                        d_13 = _e430;
                                                        let _e432 = includeCandidate(1302f);
                                                        let _e433 = d_13;
                                                        let _e434 = best_1;
                                                        if (_e432 && (_e433 < _e434)) {
                                                            {
                                                                let _e437 = d_13;
                                                                best_1 = _e437;
                                                                let _e438 = origin_1;
                                                                center = _e438;
                                                                let _e439 = size_3;
                                                                e = _e439;
                                                                c_2.key = 1302f;
                                                            }
                                                        }
                                                    }
                                                    {
                                                        let _e453 = p_58;
                                                        let _e454 = origin_2;
                                                        let _e456 = size_4;
                                                        let _e458 = sdRoundBox((_e453 - _e454), _e456, 0.012f);
                                                        d_13 = _e458;
                                                        let _e460 = includeCandidate(1303f);
                                                        let _e461 = d_13;
                                                        let _e462 = best_1;
                                                        if (_e460 && (_e461 < _e462)) {
                                                            {
                                                                let _e465 = d_13;
                                                                best_1 = _e465;
                                                                let _e466 = origin_2;
                                                                center = _e466;
                                                                let _e467 = size_4;
                                                                e = _e467;
                                                                c_2.key = 1303f;
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                let _e470 = m_8;
                                                let _e473 = m_8;
                                                if ((_e470 > 13.5f) && (_e473 < 14.5f)) {
                                                    {
                                                        c_2.radius = 0.02f;
                                                        let _e483 = includeCandidate(1401f);
                                                        if _e483 {
                                                            {
                                                                let _e496 = p_58;
                                                                let _e497 = origin_3;
                                                                let _e499 = size_5;
                                                                let _e501 = sdRoundBox((_e496 - _e497), _e499, 0.02f);
                                                                d_14 = abs(_e501);
                                                                let _e503 = d_14;
                                                                let _e504 = best_2;
                                                                if (_e503 < _e504) {
                                                                    {
                                                                        let _e506 = d_14;
                                                                        best_2 = _e506;
                                                                        let _e507 = origin_3;
                                                                        center = _e507;
                                                                        let _e508 = size_5;
                                                                        e = _e508;
                                                                        c_2.key = 1401f;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        let _e512 = includeCandidate(1402f);
                                                        if _e512 {
                                                            {
                                                                let _e525 = p_58;
                                                                let _e526 = origin_4;
                                                                let _e528 = size_6;
                                                                let _e530 = sdRoundBox((_e525 - _e526), _e528, 0.02f);
                                                                d_14 = abs(_e530);
                                                                let _e532 = d_14;
                                                                let _e533 = best_2;
                                                                if (_e532 < _e533) {
                                                                    {
                                                                        let _e535 = d_14;
                                                                        best_2 = _e535;
                                                                        let _e536 = origin_4;
                                                                        center = _e536;
                                                                        let _e537 = size_6;
                                                                        e = _e537;
                                                                        c_2.key = 1402f;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        let _e541 = includeCandidate(1403f);
                                                        if _e541 {
                                                            {
                                                                let _e553 = p_58;
                                                                let _e554 = origin_5;
                                                                let _e556 = size_7;
                                                                let _e558 = sdRoundBox((_e553 - _e554), _e556, 0.02f);
                                                                d_14 = abs(_e558);
                                                                let _e560 = d_14;
                                                                let _e561 = best_2;
                                                                if (_e560 < _e561) {
                                                                    {
                                                                        let _e563 = d_14;
                                                                        best_2 = _e563;
                                                                        let _e564 = origin_5;
                                                                        center = _e564;
                                                                        let _e565 = size_7;
                                                                        e = _e565;
                                                                        c_2.key = 1403f;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    let _e568 = m_8;
                                                    let _e571 = m_8;
                                                    if ((_e568 > 14.5f) && (_e571 < 15.5f)) {
                                                        {
                                                            let _e575 = uniforms;
                                                            let _e580 = uniforms;
                                                            wall = vec3<f32>(_e575.uTarget.x, (0.74f + _e580.uTargetY.x), -3.185f);
                                                            let _e588 = uniforms;
                                                            let _e593 = uniforms;
                                                            let _e597 = uniforms;
                                                            ring = vec3<f32>(_e588.uTarget.x, (0.03f + _e593.uTargetY.x), _e597.uTarget.y);
                                                            let _e604 = includeCandidate(1501f);
                                                            let _e606 = includeCandidate(1502f);
                                                            let _e608 = p_58;
                                                            let _e609 = wall;
                                                            let _e616 = sdRoundBox((_e608 - _e609), vec3<f32>(0.58f, 0.7f, 0.03f), 0.045f);
                                                            let _e617 = p_58;
                                                            let _e618 = ring;
                                                            let _e620 = sdRing((_e617 - _e618));
                                                            if (_e604 && (!(_e606) || (_e616 < _e620))) {
                                                                {
                                                                    let _e624 = wall;
                                                                    center = _e624;
                                                                    e = vec3<f32>(0.58f, 0.7f, 0.03f);
                                                                    c_2.radius = 0.045f;
                                                                    c_2.key = 1501f;
                                                                }
                                                            } else {
                                                                {
                                                                    let _e633 = ring;
                                                                    center = _e633;
                                                                    e = vec3<f32>(0.515f, 0.018f, 0.515f);
                                                                    c_2.shape = 4f;
                                                                    c_2.key = 1502f;
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        let _e642 = m_8;
                                                        let _e645 = m_8;
                                                        let _e649 = m_8;
                                                        let _e652 = m_8;
                                                        if (((_e642 > 15.5f) && (_e645 < 18.5f)) || ((_e649 > 19.5f) && (_e652 < 20.5f))) {
                                                            {
                                                                let _e659 = e;
                                                                let _e666 = seed_21;
                                                                let _e667 = zoneShapeAt(_e666);
                                                                let _e668 = zoneDimensions(vec4<f32>(0f, 0f, _e659.x, 0f), _e667);
                                                                shape_11 = _e668;
                                                                let _e670 = seed_21;
                                                                let _e671 = zoneBasisAt(_e670);
                                                                let _e672 = zoneRotation(_e671);
                                                                basis_11 = _e672;
                                                                let _e675 = m_8;
                                                                if (_e675 > 19.5f) {
                                                                    local_29 = 5f;
                                                                } else {
                                                                    local_29 = 6f;
                                                                }
                                                                let _e681 = local_29;
                                                                c_2.shape = _e681;
                                                                let _e683 = shape_11;
                                                                let _e685 = basis_11;
                                                                c_2.ramp = vec4<f32>(_e683.z, _e685.x, _e685.y, 0f);
                                                                let _e692 = seed_21;
                                                                let _e693 = zoneMotionAt(_e692);
                                                                c_2.warp = _e693;
                                                                let _e694 = m_8;
                                                                if (_e694 > 19.5f) {
                                                                    let _e699 = c_2;
                                                                    let _e702 = center;
                                                                    c_2.warp.w = (_e699.warp.w - (_e702.y - 0.016f));
                                                                }
                                                            }
                                                        } else {
                                                            let _e707 = m_8;
                                                            let _e710 = m_8;
                                                            if ((_e707 > 18.5f) && (_e710 < 19.5f)) {
                                                                {
                                                                    c_2.radius = 0.018f;
                                                                    let _e716 = seed_21;
                                                                    if (_e716 > 20f) {
                                                                        {
                                                                            c_2.shape = 3f;
                                                                            let _e721 = seed_21;
                                                                            if (_e721 < 21.5f) {
                                                                                let _e724 = uniforms;
                                                                                local_31 = _e724.uRampMeta0_;
                                                                            } else {
                                                                                let _e726 = seed_21;
                                                                                if (_e726 < 22.5f) {
                                                                                    let _e729 = uniforms;
                                                                                    local_30 = _e729.uRampMeta1_;
                                                                                } else {
                                                                                    let _e731 = uniforms;
                                                                                    local_30 = _e731.uRampMeta2_;
                                                                                }
                                                                                let _e734 = local_30;
                                                                                local_31 = _e734;
                                                                            }
                                                                            let _e736 = local_31;
                                                                            meta_6 = _e736;
                                                                            let _e740 = e;
                                                                            let _e743 = meta_6;
                                                                            let _e744 = _e743.yz;
                                                                            c_2.ramp = vec4<f32>((2f * _e740.y), _e744.x, _e744.y, 0f);
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                let _e749 = m_8;
                                                                if (_e749 > 21.5f) {
                                                                    {
                                                                        c_2.shape = 2f;
                                                                        let _e755 = seed_21;
                                                                        let _e756 = jellyState(_e755);
                                                                        c_2.ramp = _e756;
                                                                        let _e758 = seed_21;
                                                                        let _e759 = jellyWarp(_e758);
                                                                        c_2.warp = _e759;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    let _e760 = m_8;
    let _e763 = m_8;
    let _e766 = m_8;
    if ((_e760 < 6.5f) || ((_e763 > 12.5f) && (_e766 < 14.5f))) {
        let _e772 = center;
        c_2.pigmentOffset = _e772;
    }
    let _e774 = e;
    c_2.extent = _e774;
    let _e776 = ro_3;
    let _e777 = center;
    c_2.origin = (_e776 - _e777);
    let _e780 = rd_5;
    c_2.direction = _e780;
    let _e781 = m_8;
    let _e784 = m_8;
    if ((_e781 > 6.5f) && (_e784 < 7.5f)) {
        {
            let _e788 = uniforms;
            let _e791 = -(_e788.uCubeQ.xyz);
            let _e792 = uniforms;
            iq_1 = vec4<f32>(_e791.x, _e791.y, _e791.z, _e792.uCubeQ.w);
            let _e801 = iq_1;
            let _e802 = c_2;
            let _e804 = qrot(_e801, _e802.origin);
            c_2.origin = _e804;
            let _e806 = iq_1;
            let _e807 = rd_5;
            let _e808 = qrot(_e806, _e807);
            c_2.direction = _e808;
        }
    }
    let _e809 = c_2;
    return _e809;
}

fn candidateBaseDistance(c_3: ReliefCandidate, p_59: vec3<f32>) -> f32 {
    var c_4: ReliefCandidate;
    var p_60: vec3<f32>;

    c_4 = c_3;
    p_60 = p_59;
    let _e205 = c_4;
    if (_e205.material > 21.5f) {
        let _e209 = p_60;
        let _e210 = c_4;
        let _e212 = c_4;
        let _e215 = c_4;
        let _e217 = jellyDistance(_e209, _e210.extent, _e212.ramp.x, _e215.warp);
        return _e217;
    }
    let _e218 = c_4;
    if (_e218.shape > 5.5f) {
        let _e222 = p_60;
        let _e223 = c_4;
        let _e226 = c_4;
        let _e229 = c_4;
        let _e233 = c_4;
        let _e236 = zonePlate(_e222, vec3<f32>(_e223.extent.x, _e226.extent.z, _e229.ramp.x), _e233.ramp.yz);
        return _e236;
    }
    let _e237 = c_4;
    if (_e237.shape > 4.5f) {
        let _e241 = p_60;
        let _e242 = c_4;
        let _e245 = c_4;
        let _e247 = jumpCap(_e241, _e242.extent.x, _e245.warp);
        return _e247;
    }
    let _e248 = c_4;
    if (_e248.shape > 3.5f) {
        let _e252 = p_60;
        let _e253 = sdRing(_e252);
        return _e253;
    }
    let _e254 = c_4;
    if (_e254.shape > 2.5f) {
        let _e258 = p_60;
        let _e260 = c_4;
        let _e270 = c_4;
        let _e275 = c_4;
        let _e283 = c_4;
        let _e285 = rampObj((_e258 + vec3<f32>(0f, _e260.extent.y, 0f)), vec4<f32>(0f, 0f, (_e270.extent.x * 2f), (_e275.extent.z * 2f)), _e283.ramp);
        return _e285.x;
    }
    let _e287 = c_4;
    if (_e287.shape > 1.5f) {
        let _e291 = p_60;
        let _e292 = c_4;
        let _e295 = c_4;
        let _e298 = sdCyl(_e291, _e292.extent.x, _e295.extent.y);
        return _e298;
    }
    let _e299 = p_60;
    let _e300 = c_4;
    let _e302 = c_4;
    let _e304 = sdRoundBox(_e299, _e300.extent, _e302.radius);
    return _e304;
}

fn candidateReliefDistance(c_5: ReliefCandidate, p_61: vec3<f32>, envelope: ptr<function, f32>) -> f32 {
    var c_6: ReliefCandidate;
    var p_62: vec3<f32>;

    c_6 = c_5;
    p_62 = p_61;
    let _e206 = c_6;
    let _e207 = p_62;
    let _e208 = candidateBaseDistance(_e206, _e207);
    (*envelope) = _e208;
    let _e209 = (*envelope);
    let _e210 = c_6;
    let _e212 = reliefDepth(_e210.material);
    if (_e209 < -(_e212)) {
        let _e215 = (*envelope);
        return _e215;
    }
    let _e216 = (*envelope);
    let _e217 = c_6;
    let _e219 = p_62;
    let _e220 = c_6;
    let _e223 = c_6;
    let _e225 = c_6;
    let _e227 = surfaceInset(_e217.material, (_e219 + _e220.pigmentOffset), _e223.extent, _e225.seed);
    return (_e216 + _e227);
}

fn candidateNormal(c_7: ReliefCandidate, t_1: f32) -> vec3<f32> {
    var c_8: ReliefCandidate;
    var t_2: f32;
    var p_63: vec3<f32>;
    var d_15: vec2<f32> = vec2<f32>(0.0022f, 0f);
    var gradient_1: vec3<f32> = vec3(0f);
    var i_8: i32 = 0i;
    var local_32: vec3<f32>;
    var local_33: vec3<f32>;
    var axis_1: vec3<f32>;
    var local_34: f32;
    var side_1: f32;
    var n_4: vec3<f32>;
    var local_35: vec3<f32>;

    c_8 = c_7;
    t_2 = t_1;
    let _e205 = c_8;
    let _e207 = c_8;
    let _e209 = t_2;
    p_63 = (_e205.origin + (_e207.direction * _e209));
    loop {
        let _e223 = i_8;
        if !((_e223 < 6i)) {
            break;
        }
        {
            let _e230 = i_8;
            if (_e230 < 2i) {
                local_33 = vec3<f32>(1f, 0f, 0f);
            } else {
                let _e240 = i_8;
                if (_e240 < 4i) {
                    local_32 = vec3<f32>(0f, 1f, 0f);
                } else {
                    local_32 = vec3<f32>(0f, 0f, 1f);
                }
                let _e258 = local_32;
                local_33 = _e258;
            }
            let _e260 = local_33;
            axis_1 = _e260;
            let _e262 = i_8;
            let _e263 = f32(_e262);
            if ((_e263 - (floor((_e263 / 2f)) * 2f)) < 0.5f) {
                local_34 = 1f;
            } else {
                local_34 = -1f;
            }
            let _e275 = local_34;
            side_1 = _e275;
            let _e277 = gradient_1;
            let _e278 = axis_1;
            let _e279 = side_1;
            let _e281 = c_8;
            let _e282 = p_63;
            let _e283 = axis_1;
            let _e284 = side_1;
            let _e285 = d_15;
            let _e290 = candidateBaseDistance(_e281, (_e282 + (_e283 * (_e284 * _e285.x))));
            gradient_1 = (_e277 + ((_e278 * _e279) * _e290));
        }
        continuing {
            let _e227 = i_8;
            i_8 = (_e227 + 1i);
        }
    }
    let _e293 = gradient_1;
    n_4 = normalize(_e293);
    let _e296 = c_8;
    let _e300 = c_8;
    if ((_e296.material > 6.5f) && (_e300.material < 7.5f)) {
        let _e305 = uniforms;
        let _e307 = n_4;
        let _e308 = qrot(_e305.uCubeQ, _e307);
        local_35 = _e308;
    } else {
        let _e309 = n_4;
        local_35 = _e309;
    }
    let _e311 = local_35;
    return _e311;
}

fn candidateBoxExit(c_9: ReliefCandidate, t_3: f32) -> f32 {
    var c_10: ReliefCandidate;
    var t_4: f32;
    var p_64: vec3<f32>;
    var e_1: vec3<f32>;
    var span_3: f32 = 24f;

    c_10 = c_9;
    t_4 = t_3;
    let _e205 = c_10;
    let _e207 = c_10;
    let _e209 = t_4;
    p_64 = (_e205.origin + (_e207.direction * _e209));
    let _e213 = c_10;
    e_1 = _e213.extent;
    let _e216 = c_10;
    if (_e216.shape > 2.5f) {
        let _e221 = e_1;
        e_1.y = (_e221.y + 0.025f);
    }
    let _e227 = c_10;
    if (abs(_e227.direction.x) > 0.00001f) {
        let _e233 = span_3;
        let _e234 = c_10;
        let _e238 = e_1;
        let _e241 = p_64;
        let _e244 = c_10;
        span_3 = min(_e233, (((sign(_e234.direction.x) * _e238.x) - _e241.x) / _e244.direction.x));
    }
    let _e249 = c_10;
    if (abs(_e249.direction.y) > 0.00001f) {
        let _e255 = span_3;
        let _e256 = c_10;
        let _e260 = e_1;
        let _e263 = p_64;
        let _e266 = c_10;
        span_3 = min(_e255, (((sign(_e256.direction.y) * _e260.y) - _e263.y) / _e266.direction.y));
    }
    let _e271 = c_10;
    if (abs(_e271.direction.z) > 0.00001f) {
        let _e277 = span_3;
        let _e278 = c_10;
        let _e282 = e_1;
        let _e285 = p_64;
        let _e288 = c_10;
        span_3 = min(_e277, (((sign(_e278.direction.z) * _e282.z) - _e285.z) / _e288.direction.z));
    }
    let _e293 = t_4;
    let _e294 = span_3;
    return (_e293 + max(_e294, 0f));
}

fn parallaxOcclusion(c_11: ReliefCandidate, entry: f32) -> vec2<f32> {
    var c_12: ReliefCandidate;
    var entry_1: f32;

    c_12 = c_11;
    entry_1 = entry;
    let _e205 = entry_1;
    let _e206 = c_12;
    return vec2<f32>(_e205, _e206.material);
}

fn reliefGradient(m_9: f32, q_12: vec3<f32>, extent_11: vec3<f32>, seed_22: f32) -> vec3<f32> {
    var m_10: f32;
    var q_13: vec3<f32>;
    var extent_12: vec3<f32>;
    var seed_23: f32;

    m_10 = m_9;
    q_13 = q_12;
    extent_12 = extent_11;
    seed_23 = seed_22;
    return vec3(0f);
}

fn reliefVisibility(m_11: f32, p_65: vec3<f32>, n_5: vec3<f32>, light: vec3<f32>) -> f32 {
    var m_12: f32;
    var p_66: vec3<f32>;
    var n_6: vec3<f32>;
    var light_1: vec3<f32>;

    m_12 = m_11;
    p_66 = p_65;
    n_6 = n_5;
    light_1 = light;
    return 1f;
}

fn reliefLighting(m_13: f32, q_14: vec3<f32>, extent_13: vec3<f32>, seed_24: f32, normal_1: vec3<f32>, keyLight: vec3<f32>, rimLight: vec3<f32>, gradient_2: ptr<function, vec3<f32>>, visibility_1: ptr<function, vec2<f32>>) {
    var m_14: f32;
    var q_15: vec3<f32>;
    var extent_14: vec3<f32>;
    var seed_25: f32;
    var normal_2: vec3<f32>;
    var keyLight_1: vec3<f32>;
    var rimLight_1: vec3<f32>;

    m_14 = m_13;
    q_15 = q_14;
    extent_14 = extent_13;
    seed_25 = seed_24;
    normal_2 = normal_1;
    keyLight_1 = keyLight;
    rimLight_1 = rimLight;
    (*gradient_2) = vec3(0f);
    (*visibility_1) = vec2(1f);
    return;
}

fn woodMaterial(m_15: f32, p_67: vec3<f32>, n_7: vec3<f32>, extent_15: vec3<f32>, seed_26: f32, worldPoint: vec3<f32>, zoneEdge: vec3<f32>, albedo: ptr<function, vec3<f32>>, rough: ptr<function, f32>, spec: ptr<function, f32>, emit: ptr<function, vec3<f32>>, layers: ptr<function, vec4<f32>>, relief: ptr<function, vec3<f32>>) {
    var m_16: f32;
    var p_68: vec3<f32>;
    var n_8: vec3<f32>;
    var extent_16: vec3<f32>;
    var seed_27: f32;
    var worldPoint_1: vec3<f32>;
    var zoneEdge_1: vec3<f32>;
    var uv_7: vec2<f32>;
    var local_36: vec2<f32>;
    var id_1: vec2<f32>;
    var identity_2: f32;
    var slope_2: vec2<f32>;
    var tissue: vec4<f32>;
    var row_1: f32;
    var offset_3: f32;
    var joint_1: f32;
    var pigment: vec3<f32>;

    m_16 = m_15;
    p_68 = p_67;
    n_8 = n_7;
    extent_16 = extent_15;
    seed_27 = seed_26;
    worldPoint_1 = worldPoint;
    zoneEdge_1 = zoneEdge;
    let _e221 = p_68;
    let _e222 = n_8;
    let _e223 = faceUV(_e221, _e222);
    uv_7 = _e223;
    let _e227 = uv_7;
    woodBoardCoordinates(_e227, (&local_36), (&id_1));
    let _e232 = id_1;
    let _e237 = hash((_e232 + vec2<f32>(11f, 4f)));
    identity_2 = _e237;
    let _e240 = local_36;
    let _e241 = identity_2;
    let _e244 = woodAnatomy(_e240, _e241, (&slope_2));
    tissue = _e244;
    let _e246 = id_1;
    row_1 = _e246.x;
    let _e249 = row_1;
    let _e252 = hash(vec2<f32>(_e249, 2.7f));
    offset_3 = _e252;
    let _e254 = uv_7;
    let _e260 = filteredStripe((_e254.x + 3.25f), 0.22f, 0.002f);
    let _e261 = uv_7;
    let _e265 = offset_3;
    let _e271 = filteredStripe(((_e261.y + 3.25f) + (_e265 * 1.65f)), 1.65f, 0.002f);
    joint_1 = max(_e260, _e271);
    let _e282 = identity_2;
    pigment = mix(vec3<f32>(0.57f, 0.383f, 0.213f), vec3<f32>(0.66f, 0.456f, 0.267f), vec3(_e282));
    let _e286 = pigment;
    let _e288 = tissue;
    let _e295 = tissue;
    let _e300 = tissue;
    let _e305 = tissue;
    let _e310 = joint_1;
    (*albedo) = (_e286 * (((((1f - ((_e288.x - 0.19f) * 0.26f)) + (_e295.y * 0.085f)) + (_e300.w * 0.16f)) - (_e305.z * 0.2f)) - (_e310 * 0.25f)));
    let _e316 = identity_2;
    let _e322 = tissue;
    let _e327 = tissue;
    let _e332 = tissue;
    let _e337 = joint_1;
    (*rough) = (((((0.545f + ((_e316 - 0.5f) * 0.034f)) + (_e322.x * 0.035f)) - (_e327.y * 0.022f)) + (_e332.z * 0.085f)) + (_e337 * 0.08f));
    (*spec) = 0.2f;
    let _e342 = local_36;
    let _e347 = microRelief(_e342, vec2<f32>(27f, 3.2f), 0.017f);
    (*relief) = _e347;
    let _e348 = (*relief);
    let _e350 = (*relief);
    let _e352 = slope_2;
    let _e353 = (_e350.xy + _e352);
    (*relief).x = _e353.x;
    (*relief).y = _e353.y;
    let _e359 = (*relief);
    let _e365 = id_1;
    let _e370 = hash((_e365 + vec2<f32>(7f, 3f)));
    (*relief).y = (_e359.y * mix(-1f, 1f, step(0.5f, _e370)));
    return;
}

fn carpetMaterial(m_17: f32, p_69: vec3<f32>, n_9: vec3<f32>, extent_17: vec3<f32>, seed_28: f32, worldPoint_2: vec3<f32>, zoneEdge_2: vec3<f32>, albedo_1: ptr<function, vec3<f32>>, rough_1: ptr<function, f32>, spec_1: ptr<function, f32>, emit_1: ptr<function, vec3<f32>>, layers_1: ptr<function, vec4<f32>>, relief_1: ptr<function, vec3<f32>>) {
    var m_18: f32;
    var p_70: vec3<f32>;
    var n_10: vec3<f32>;
    var extent_18: vec3<f32>;
    var seed_29: f32;
    var worldPoint_3: vec3<f32>;
    var zoneEdge_3: vec3<f32>;
    var uv_8: vec2<f32>;
    var binding: f32;
    var nap: f32;
    var yarn_1: f32;

    m_18 = m_17;
    p_70 = p_69;
    n_10 = n_9;
    extent_18 = extent_17;
    seed_29 = seed_28;
    worldPoint_3 = worldPoint_2;
    zoneEdge_3 = zoneEdge_2;
    let _e221 = p_70;
    uv_8 = _e221.xz;
    let _e226 = p_70;
    let _e232 = p_70;
    binding = max(smoothstep(2f, 2.075f, abs(_e226.x)), smoothstep(1.19f, 1.265f, abs((_e232.z - 0.78f))));
    let _e240 = uv_8;
    let _e246 = materialNoise((_e240 * vec2<f32>(5f, 8f)), 8f);
    nap = (_e246.x - 0.5f);
    let _e256 = nap;
    let _e260 = binding;
    (*albedo_1) = (vec3<f32>(0.245f, 0.262f, 0.269f) * ((1f + (_e256 * 0.055f)) - (_e260 * 0.16f)));
    let _e265 = uv_8;
    let _e270 = uv_8;
    let _e277 = detailWeight(70f);
    yarn_1 = ((sin((_e265.x * 440f)) * sin((_e270.y * 360f))) * _e277);
    let _e280 = (*albedo_1);
    let _e282 = yarn_1;
    (*albedo_1) = (_e280 * (1f + (_e282 * 0.065f)));
    (*rough_1) = 0.96f;
    (*spec_1) = 0.07f;
    (*layers_1).w = 0.1f;
    let _e291 = uv_8;
    let _e296 = microRelief(_e291, vec2<f32>(36f, 48f), 0.038f);
    (*relief_1) = _e296;
    return;
}

fn wallMaterial(m_19: f32, p_71: vec3<f32>, n_11: vec3<f32>, extent_19: vec3<f32>, seed_30: f32, worldPoint_4: vec3<f32>, zoneEdge_4: vec3<f32>, albedo_2: ptr<function, vec3<f32>>, rough_2: ptr<function, f32>, spec_2: ptr<function, f32>, emit_2: ptr<function, vec3<f32>>, layers_2: ptr<function, vec4<f32>>, relief_2: ptr<function, vec3<f32>>) {
    var m_20: f32;
    var p_72: vec3<f32>;
    var n_12: vec3<f32>;
    var extent_20: vec3<f32>;
    var seed_31: f32;
    var worldPoint_5: vec3<f32>;
    var zoneEdge_5: vec3<f32>;
    var uv_9: vec2<f32>;
    var mineral: f32;
    var panel: f32;

    m_20 = m_19;
    p_72 = p_71;
    n_12 = n_11;
    extent_20 = extent_19;
    seed_31 = seed_30;
    worldPoint_5 = worldPoint_4;
    zoneEdge_5 = zoneEdge_4;
    let _e221 = p_72;
    let _e222 = n_12;
    let _e223 = faceUV(_e221, _e222);
    uv_9 = _e223;
    let _e225 = uv_9;
    let _e229 = materialNoise((_e225 * 0.85f), 0.85f);
    mineral = (_e229.x - 0.5f);
    let _e234 = uv_9;
    let _e240 = filteredStripe((_e234.x + 0.8f), 1.6f, 0.003f);
    panel = _e240;
    let _e242 = m_20;
    if (_e242 < 3.5f) {
        (*albedo_2) = vec3<f32>(0.67f, 0.45f, 0.22f);
    } else {
        let _e249 = m_20;
        if (_e249 < 4.5f) {
            (*albedo_2) = vec3<f32>(0.35f, 0.49f, 0.26f);
        } else {
            let _e256 = m_20;
            if (_e256 < 5.5f) {
                (*albedo_2) = vec3<f32>(0.74f, 0.74f, 0.7f);
            } else {
                (*albedo_2) = vec3<f32>(0.58f, 0.61f, 0.6f);
            }
        }
    }
    let _e267 = (*albedo_2);
    let _e269 = mineral;
    let _e273 = panel;
    (*albedo_2) = (_e267 * ((1f + (_e269 * 0.028f)) - (_e273 * 0.018f)));
    let _e279 = mineral;
    (*rough_2) = (0.86f + (_e279 * 0.035f));
    (*spec_2) = 0.18f;
    let _e284 = uv_9;
    let _e289 = microRelief(_e284, vec2<f32>(21f, 26f), 0.016f);
    (*relief_2) = _e289;
    return;
}

fn cubeMaterial(m_21: f32, p_73: vec3<f32>, n_13: vec3<f32>, extent_21: vec3<f32>, seed_32: f32, worldPoint_6: vec3<f32>, zoneEdge_6: vec3<f32>, albedo_3: ptr<function, vec3<f32>>, rough_3: ptr<function, f32>, spec_3: ptr<function, f32>, emit_3: ptr<function, vec3<f32>>, layers_3: ptr<function, vec4<f32>>, relief_3: ptr<function, vec3<f32>>) {
    var m_22: f32;
    var p_74: vec3<f32>;
    var n_14: vec3<f32>;
    var extent_22: vec3<f32>;
    var seed_33: f32;
    var worldPoint_7: vec3<f32>;
    var zoneEdge_7: vec3<f32>;
    var uv_10: vec2<f32>;
    var edge: f32;
    var paint: f32;
    var abrasion: f32 = 0f;
    var scratches: f32 = 0f;
    var lower: f32;
    var slime: f32;
    var wet: f32;

    m_22 = m_21;
    p_74 = p_73;
    n_14 = n_13;
    extent_22 = extent_21;
    seed_33 = seed_32;
    worldPoint_7 = worldPoint_6;
    zoneEdge_7 = zoneEdge_6;
    let _e221 = p_74;
    let _e222 = n_14;
    let _e223 = faceUV(_e221, _e222);
    uv_10 = _e223;
    let _e225 = p_74;
    let _e226 = cubeEdge(_e225);
    edge = _e226;
    let _e228 = uv_10;
    let _e236 = materialNoise(((_e228 * 17f) + vec2<f32>(2.1f, 5.3f)), 17f);
    paint = (_e236.x - 0.5f);
    let _e245 = edge;
    abrasion = (_e245 * 0.025f);
    let _e253 = paint;
    (*albedo_3) = (vec3<f32>(0.665f, 0.029f, 0.018f) * (1f + (_e253 * 0.055f)));
    let _e258 = (*albedo_3);
    let _e263 = abrasion;
    (*albedo_3) = mix(_e258, vec3<f32>(0.37f, 0.385f, 0.4f), vec3(_e263));
    let _e267 = paint;
    let _e271 = scratches;
    let _e275 = abrasion;
    (*rough_3) = (((0.31f + (_e267 * 0.04f)) + (_e271 * 0.13f)) + (_e275 * 0.12f));
    (*spec_3) = 0.28f;
    let _e281 = abrasion;
    (*layers_3).x = (_e281 * 0.9f);
    let _e287 = abrasion;
    (*layers_3).y = (0.3f * (1f - _e287));
    (*layers_3).z = 0.23f;
    let _e292 = uv_10;
    let _e297 = microRelief(_e292, vec2<f32>(38f, 38f), 0.026f);
    (*relief_3) = _e297;
    let _e299 = (*relief_3);
    let _e301 = scratches;
    (*relief_3).x = (_e299.x + (_e301 * 0.009f));
    let _e309 = p_74;
    let _e311 = cubeScale();
    lower = (1f - smoothstep(-0.08f, 0.19f, (_e309.y / _e311)));
    let _e316 = uniforms;
    let _e319 = lower;
    slime = (_e316.uSurfaceContact.y * _e319);
    let _e322 = uniforms;
    let _e327 = slime;
    wet = max((_e322.uSurfaceContact.x * 0.8f), _e327);
    let _e330 = (*albedo_3);
    let _e335 = slime;
    (*albedo_3) = mix(_e330, vec3<f32>(0.41f, 0.075f, 0.49f), vec3((_e335 * 0.38f)));
    let _e340 = (*rough_3);
    let _e342 = wet;
    (*rough_3) = mix(_e340, 0.19f, (_e342 * 0.7f));
    let _e347 = (*layers_3);
    let _e350 = wet;
    (*layers_3).y = mix(_e347.y, 0.78f, _e350);
    let _e353 = (*layers_3);
    let _e356 = wet;
    (*layers_3).z = mix(_e353.z, 0.19f, _e356);
    return;
}

fn obstacleMaterial(m_23: f32, p_75: vec3<f32>, n_15: vec3<f32>, extent_23: vec3<f32>, seed_34: f32, worldPoint_8: vec3<f32>, zoneEdge_8: vec3<f32>, albedo_4: ptr<function, vec3<f32>>, rough_4: ptr<function, f32>, spec_4: ptr<function, f32>, emit_4: ptr<function, vec3<f32>>, layers_4: ptr<function, vec4<f32>>, relief_4: ptr<function, vec3<f32>>) {
    var m_24: f32;
    var p_76: vec3<f32>;
    var n_16: vec3<f32>;
    var extent_24: vec3<f32>;
    var seed_35: f32;
    var worldPoint_9: vec3<f32>;
    var zoneEdge_9: vec3<f32>;
    var uv_11: vec2<f32>;
    var edge_1: f32;
    var powder: f32;
    var wear: f32 = 0f;

    m_24 = m_23;
    p_76 = p_75;
    n_16 = n_15;
    extent_24 = extent_23;
    seed_35 = seed_34;
    worldPoint_9 = worldPoint_8;
    zoneEdge_9 = zoneEdge_8;
    let _e221 = p_76;
    let _e222 = n_16;
    let _e223 = faceUV(_e221, _e222);
    uv_11 = _e223;
    let _e225 = p_76;
    let _e226 = extent_24;
    let _e227 = edgeMask(_e225, _e226);
    edge_1 = _e227;
    let _e229 = uv_11;
    let _e234 = seed_35;
    let _e238 = materialNoise(((_e229 * vec2<f32>(12f, 19f)) + vec2(_e234)), 19f);
    powder = (_e238.x - 0.5f);
    let _e250 = powder;
    let _e259 = wear;
    (*albedo_4) = mix((vec3<f32>(0.255f, 0.297f, 0.326f) * (1f + (_e250 * 0.03f))), vec3<f32>(0.44f, 0.46f, 0.48f), vec3(_e259));
    let _e263 = powder;
    let _e267 = wear;
    (*rough_4) = ((0.46f + (_e263 * 0.055f)) - (_e267 * 0.1f));
    (*spec_4) = 0.29f;
    let _e273 = wear;
    (*layers_4).x = (_e273 * 0.88f);
    let _e276 = uv_11;
    let _e281 = microRelief(_e276, vec2<f32>(7f, 49f), 0.021f);
    (*relief_4) = _e281;
    return;
}

fn greenGoalMaterial(m_25: f32, p_77: vec3<f32>, n_17: vec3<f32>, extent_25: vec3<f32>, seed_36: f32, worldPoint_10: vec3<f32>, zoneEdge_10: vec3<f32>, albedo_5: ptr<function, vec3<f32>>, rough_5: ptr<function, f32>, spec_5: ptr<function, f32>, emit_5: ptr<function, vec3<f32>>, layers_5: ptr<function, vec4<f32>>, relief_5: ptr<function, vec3<f32>>) {
    var m_26: f32;
    var p_78: vec3<f32>;
    var n_18: vec3<f32>;
    var extent_26: vec3<f32>;
    var seed_37: f32;
    var worldPoint_11: vec3<f32>;
    var zoneEdge_11: vec3<f32>;
    var rim_1: f32;
    var symbol: f32;
    var top: f32;

    m_26 = m_25;
    p_78 = p_77;
    n_18 = n_17;
    extent_26 = extent_25;
    seed_37 = seed_36;
    worldPoint_11 = worldPoint_10;
    zoneEdge_11 = zoneEdge_10;
    let _e221 = p_78;
    let _e228 = filteredStripe((length(_e221.xz) - 0.425f), 2f, 0.035f);
    rim_1 = _e228;
    let _e230 = p_78;
    let _e237 = filteredStripe((length(_e230.xz) - 0.29f), 2f, 0.02f);
    symbol = _e237;
    let _e241 = n_18;
    top = smoothstep(0.25f, 0.75f, _e241.y);
    let _e253 = top;
    (*albedo_5) = mix(vec3<f32>(0.085f, 0.2f, 0.145f), vec3<f32>(0.06f, 0.75f, 0.29f), vec3(_e253));
    let _e260 = top;
    let _e263 = symbol;
    let _e267 = rim_1;
    (*emit_5) = ((vec3<f32>(0.035f, 0.95f, 0.25f) * _e260) * ((0.42f + (_e263 * 0.35f)) + (_e267 * 0.16f)));
    (*rough_5) = 0.37f;
    (*spec_5) = 0.25f;
    let _e274 = p_78;
    let _e280 = microRelief(_e274.xz, vec2<f32>(18f, 18f), 0.006f);
    (*relief_5) = _e280;
    return;
}

fn blueGoalMaterial(m_27: f32, p_79: vec3<f32>, n_19: vec3<f32>, extent_27: vec3<f32>, seed_38: f32, worldPoint_12: vec3<f32>, zoneEdge_12: vec3<f32>, albedo_6: ptr<function, vec3<f32>>, rough_6: ptr<function, f32>, spec_6: ptr<function, f32>, emit_6: ptr<function, vec3<f32>>, layers_6: ptr<function, vec4<f32>>, relief_6: ptr<function, vec3<f32>>) {
    var m_28: f32;
    var p_80: vec3<f32>;
    var n_20: vec3<f32>;
    var extent_28: vec3<f32>;
    var seed_39: f32;
    var worldPoint_13: vec3<f32>;
    var zoneEdge_13: vec3<f32>;
    var crossMark: f32;
    var top_1: f32;

    m_28 = m_27;
    p_80 = p_79;
    n_20 = n_19;
    extent_28 = extent_27;
    seed_39 = seed_38;
    worldPoint_13 = worldPoint_12;
    zoneEdge_13 = zoneEdge_12;
    let _e221 = p_80;
    let _e225 = filteredStripe(_e221.x, 2f, 0.035f);
    let _e226 = p_80;
    let _e230 = filteredStripe(_e226.z, 2f, 0.035f);
    crossMark = max(_e225, _e230);
    let _e235 = n_20;
    top_1 = smoothstep(0.25f, 0.75f, _e235.y);
    let _e247 = top_1;
    (*albedo_6) = mix(vec3<f32>(0.1f, 0.16f, 0.235f), vec3<f32>(0.12f, 0.4f, 0.89f), vec3(_e247));
    let _e254 = top_1;
    let _e257 = crossMark;
    (*emit_6) = ((vec3<f32>(0.045f, 0.28f, 1f) * _e254) * (0.44f + (_e257 * 0.34f)));
    (*rough_6) = 0.35f;
    (*spec_6) = 0.25f;
    let _e264 = p_80;
    let _e270 = microRelief(_e264.xz, vec2<f32>(18f, 18f), 0.006f);
    (*relief_6) = _e270;
    return;
}

fn ringMaterial(m_29: f32, p_81: vec3<f32>, n_21: vec3<f32>, extent_29: vec3<f32>, seed_40: f32, worldPoint_14: vec3<f32>, zoneEdge_14: vec3<f32>, albedo_7: ptr<function, vec3<f32>>, rough_7: ptr<function, f32>, spec_7: ptr<function, f32>, emit_7: ptr<function, vec3<f32>>, layers_7: ptr<function, vec4<f32>>, relief_7: ptr<function, vec3<f32>>) {
    var m_30: f32;
    var p_82: vec3<f32>;
    var n_22: vec3<f32>;
    var extent_30: vec3<f32>;
    var seed_41: f32;
    var worldPoint_15: vec3<f32>;
    var zoneEdge_15: vec3<f32>;
    var angle_1: f32;
    var charged: f32;
    var ticks: f32;

    m_30 = m_29;
    p_82 = p_81;
    n_22 = n_21;
    extent_30 = extent_29;
    seed_41 = seed_40;
    worldPoint_15 = worldPoint_14;
    zoneEdge_15 = zoneEdge_14;
    let _e221 = p_82;
    let _e225 = p_82;
    angle_1 = ((atan2((_e221.z + 0.00001f), (_e225.x + 0.00001f)) / 6.283185f) + 0.5f);
    let _e236 = uniforms;
    let _e241 = uniforms;
    let _e246 = angle_1;
    charged = (1f - smoothstep((_e236.uHold.x - 0.006f), (_e241.uHold.x + 0.006f), _e246));
    let _e250 = angle_1;
    let _e257 = filteredStripe((_e250 * 2.8274f), 0.117808335f, 0.015f);
    ticks = _e257;
    (*albedo_7) = vec3<f32>(0.88f, 0.63f, 0.12f);
    (*rough_7) = 0.39f;
    (*spec_7) = 0.25f;
    let _e270 = charged;
    let _e276 = ticks;
    (*emit_7) = ((vec3<f32>(1f, 0.53f, 0.035f) * (0.45f + (_e270 * 0.77f))) * (1f - (_e276 * 0.14f)));
    return;
}

fn lightMaterial(m_31: f32, p_83: vec3<f32>, n_23: vec3<f32>, extent_31: vec3<f32>, seed_42: f32, worldPoint_16: vec3<f32>, zoneEdge_16: vec3<f32>, albedo_8: ptr<function, vec3<f32>>, rough_8: ptr<function, f32>, spec_8: ptr<function, f32>, emit_8: ptr<function, vec3<f32>>, layers_8: ptr<function, vec4<f32>>, relief_8: ptr<function, vec3<f32>>) {
    var m_32: f32;
    var p_84: vec3<f32>;
    var n_24: vec3<f32>;
    var extent_32: vec3<f32>;
    var seed_43: f32;
    var worldPoint_17: vec3<f32>;
    var zoneEdge_17: vec3<f32>;

    m_32 = m_31;
    p_84 = p_83;
    n_24 = n_23;
    extent_32 = extent_31;
    seed_43 = seed_42;
    worldPoint_17 = worldPoint_16;
    zoneEdge_17 = zoneEdge_16;
    (*albedo_8) = vec3<f32>(0.95f, 0.88f, 0.73f);
    (*emit_8) = vec3<f32>(3.2f, 2.688f, 2.016f);
    (*rough_8) = 0.3f;
    (*spec_8) = 0.23f;
    return;
}

fn trimMaterial(m_33: f32, p_85: vec3<f32>, n_25: vec3<f32>, extent_33: vec3<f32>, seed_44: f32, worldPoint_18: vec3<f32>, zoneEdge_18: vec3<f32>, albedo_9: ptr<function, vec3<f32>>, rough_9: ptr<function, f32>, spec_9: ptr<function, f32>, emit_9: ptr<function, vec3<f32>>, layers_9: ptr<function, vec4<f32>>, relief_9: ptr<function, vec3<f32>>) {
    var m_34: f32;
    var p_86: vec3<f32>;
    var n_26: vec3<f32>;
    var extent_34: vec3<f32>;
    var seed_45: f32;
    var worldPoint_19: vec3<f32>;
    var zoneEdge_19: vec3<f32>;

    m_34 = m_33;
    p_86 = p_85;
    n_26 = n_25;
    extent_34 = extent_33;
    seed_45 = seed_44;
    worldPoint_19 = worldPoint_18;
    zoneEdge_19 = zoneEdge_18;
    (*albedo_9) = vec3<f32>(0.38f, 0.3f, 0.23f);
    (*rough_9) = 0.45f;
    (*spec_9) = 0.24f;
    (*layers_9).x = 0.75f;
    let _e229 = p_86;
    let _e230 = n_26;
    let _e231 = faceUV(_e229, _e230);
    let _e236 = microRelief(_e231, vec2<f32>(4f, 42f), 0.017f);
    (*relief_9) = _e236;
    return;
}

fn portalMaterial(m_35: f32, p_87: vec3<f32>, n_27: vec3<f32>, extent_35: vec3<f32>, seed_46: f32, worldPoint_20: vec3<f32>, zoneEdge_20: vec3<f32>, albedo_10: ptr<function, vec3<f32>>, rough_10: ptr<function, f32>, spec_10: ptr<function, f32>, emit_10: ptr<function, vec3<f32>>, layers_10: ptr<function, vec4<f32>>, relief_10: ptr<function, vec3<f32>>) {
    var m_36: f32;
    var p_88: vec3<f32>;
    var n_28: vec3<f32>;
    var extent_36: vec3<f32>;
    var seed_47: f32;
    var worldPoint_21: vec3<f32>;
    var zoneEdge_21: vec3<f32>;
    var local_37: f32;
    var frame: f32;

    m_36 = m_35;
    p_88 = p_87;
    n_28 = n_27;
    extent_36 = extent_35;
    seed_47 = seed_46;
    worldPoint_21 = worldPoint_20;
    zoneEdge_21 = zoneEdge_20;
    let _e221 = n_28;
    if (abs(_e221.y) > 0.5f) {
        local_37 = 0f;
    } else {
        let _e229 = p_88;
        let _e234 = p_88;
        local_37 = smoothstep(0.83f, 0.94f, max((abs(_e229.x) / 0.58f), (abs(_e234.y) / 0.7f)));
    }
    let _e242 = local_37;
    frame = _e242;
    let _e252 = frame;
    (*albedo_10) = mix(vec3<f32>(0.025f, 0.11f, 0.065f), vec3<f32>(0.13f, 0.25f, 0.19f), vec3(_e252));
    let _e257 = frame;
    (*rough_10) = mix(0.29f, 0.43f, _e257);
    (*spec_10) = 0.28f;
    let _e261 = frame;
    (*layers_10).x = (_e261 * 0.65f);
    (*emit_10) = vec3<f32>(0.025f, 0.9f, 0.37f);
    return;
}

fn iceMaterial(m_37: f32, p_89: vec3<f32>, n_29: vec3<f32>, extent_37: vec3<f32>, seed_48: f32, worldPoint_22: vec3<f32>, zoneEdge_22: vec3<f32>, albedo_11: ptr<function, vec3<f32>>, rough_11: ptr<function, f32>, spec_11: ptr<function, f32>, emit_11: ptr<function, vec3<f32>>, layers_11: ptr<function, vec4<f32>>, relief_11: ptr<function, vec3<f32>>) {
    var m_38: f32;
    var p_90: vec3<f32>;
    var n_30: vec3<f32>;
    var extent_38: vec3<f32>;
    var seed_49: f32;
    var worldPoint_23: vec3<f32>;
    var zoneEdge_23: vec3<f32>;
    var uv_12: vec2<f32>;
    var world: vec2<f32>;
    var delta: vec2<f32>;
    var time: f32;
    var radius_3: f32;
    var speed: f32;
    var local_38: vec2<f32>;
    var direction: vec2<f32>;
    var behind: f32;
    var side_2: f32;
    var contact: f32;
    var skid: f32;
    var wake: f32;
    var ripple: f32;
    var phase_3: vec2<f32>;
    var wave_1: vec2<f32>;
    var slope_3: vec2<f32>;
    var swell: vec3<f32>;
    var meniscus: f32;
    var crest: f32;
    var spread: f32;
    var foamSide: f32;
    var foam: f32;

    m_38 = m_37;
    p_90 = p_89;
    n_30 = n_29;
    extent_38 = extent_37;
    seed_49 = seed_48;
    worldPoint_23 = worldPoint_22;
    zoneEdge_23 = zoneEdge_22;
    let _e221 = p_90;
    uv_12 = _e221.xz;
    let _e224 = worldPoint_23;
    world = _e224.xz;
    let _e227 = world;
    let _e228 = uniforms;
    delta = (_e227 - _e228.uCube.xy);
    let _e233 = effectTime();
    time = _e233;
    let _e235 = delta;
    radius_3 = length(_e235);
    let _e238 = uniforms;
    speed = min(length(_e238.uCubeVelocity.xy), 4f);
    let _e245 = uniforms;
    if (length(_e245.uCubeVelocity.xy) > 0.001f) {
        let _e251 = uniforms;
        local_38 = normalize(_e251.uCubeVelocity.xy);
    } else {
        local_38 = vec2<f32>(1f, 0f);
    }
    let _e261 = local_38;
    direction = _e261;
    let _e263 = delta;
    let _e264 = direction;
    behind = -(dot(_e263, _e264));
    let _e268 = delta;
    let _e269 = direction;
    let _e272 = direction;
    side_2 = dot(_e268, vec2<f32>(-(_e269.y), _e272.x));
    let _e277 = uniforms;
    let _e280 = uniforms;
    let _e284 = uniforms;
    contact = ((_e277.uSurfaceContact.x * _e280.uSurfaceContact.z) * _e284.uLook.w);
    let _e289 = uniforms;
    skid = _e289.uSurfaceContact.w;
    let _e293 = side_2;
    let _e295 = side_2;
    let _e302 = behind;
    let _e308 = behind;
    let _e312 = contact;
    let _e314 = speed;
    wake = (((((exp(((-(_e293) * _e295) * 22f)) * smoothstep(0f, 0.22f, _e302)) * (1f - smoothstep(0.25f, 1.25f, _e308))) * _e312) * _e314) * 0.25f);
    let _e319 = radius_3;
    let _e322 = time;
    let _e327 = radius_3;
    let _e339 = radius_3;
    let _e342 = contact;
    ripple = (((sin(((_e319 * 24f) - (_e322 * 5f))) * exp((-(max((_e327 - 0.24f), 0f)) * 3f))) * smoothstep(0.2f, 0.34f, _e339)) * _e342);
    let _e345 = uv_12;
    let _e350 = time;
    let _e354 = uv_12;
    let _e360 = time;
    phase_3 = vec2<f32>((dot(_e345, vec2<f32>(4.2f, 2.8f)) + (_e350 * 0.7f)), (dot(_e354, vec2<f32>(-1.7f, 5.4f)) - (_e360 * 0.48f)));
    let _e366 = phase_3;
    wave_1 = sin(_e366);
    let _e369 = phase_3;
    slope_3 = cos(_e369);
    let _e373 = wave_1;
    let _e375 = wave_1;
    let _e381 = slope_3;
    let _e385 = slope_3;
    let _e390 = slope_3;
    let _e394 = slope_3;
    swell = vec3<f32>((0.5f + ((_e373.x + _e375.y) * 0.16f)), ((_e381.x * 0.5f) - (_e385.y * 0.2f)), ((_e390.x * 0.3f) + (_e394.y * 0.6f)));
    let _e404 = zoneEdge_23;
    meniscus = (1f - smoothstep(0.008f, 0.075f, _e404.x));
    let _e411 = radius_3;
    let _e414 = time;
    let _e420 = radius_3;
    let _e430 = contact;
    crest = ((smoothstep(0.55f, 0.93f, sin(((_e411 * 24f) - (_e414 * 5f)))) * exp((-(max((_e420 - 0.3f), 0f)) * 2.5f))) * _e430);
    let _e434 = behind;
    spread = (0.16f + (max(_e434, 0f) * 0.3f));
    let _e441 = side_2;
    let _e443 = spread;
    foamSide = ((abs(_e441) - _e443) * 11f);
    let _e448 = foamSide;
    let _e450 = foamSide;
    let _e455 = behind;
    let _e461 = behind;
    let _e465 = contact;
    let _e467 = speed;
    let _e470 = skid;
    foam = ((((exp((-(_e448) * _e450)) * smoothstep(0f, 0.2f, _e455)) * (1f - smoothstep(0.4f, 1.5f, _e461))) * _e465) * ((_e467 * 0.22f) + (_e470 * 0.75f)));
    let _e484 = swell;
    let _e488 = meniscus;
    (*albedo_11) = mix(vec3<f32>(0.025f, 0.24f, 0.37f), vec3<f32>(0.1f, 0.55f, 0.65f), vec3(((_e484.x * 0.45f) + (_e488 * 0.3f))));
    let _e494 = (*albedo_11);
    let _e499 = foam;
    let _e502 = crest;
    let _e503 = speed;
    let _e506 = skid;
    (*albedo_11) = mix(_e494, vec3<f32>(0.72f, 0.91f, 0.93f), vec3(clamp(((_e499 * 0.8f) + (_e502 * ((_e503 * 0.1f) + (_e506 * 0.22f)))), 0f, 0.8f)));
    let _e519 = swell;
    (*rough_11) = (0.18f + (0.015f * _e519.x));
    (*spec_11) = 0.42f;
    (*layers_11).y = 0.94f;
    (*layers_11).z = 0.18f;
    let _e528 = swell;
    let _e531 = (_e528.yz * 0.105f);
    (*relief_11) = vec3<f32>(_e531.x, _e531.y, 0f);
    let _e536 = (*relief_11);
    let _e538 = (*relief_11);
    let _e540 = delta;
    let _e541 = radius_3;
    let _e546 = ripple;
    let _e549 = skid;
    let _e554 = direction;
    let _e557 = direction;
    let _e560 = wake;
    let _e562 = side_2;
    let _e570 = (_e538.xy + ((((_e540 / vec2(max(_e541, 0.03f))) * _e546) * (0.1f + (_e549 * 0.12f))) + (((vec2<f32>(-(_e554.y), _e557.x) * _e560) * sin((_e562 * 20f))) * 0.21f)));
    (*relief_11).x = _e570.x;
    (*relief_11).y = _e570.y;
    let _e575 = (*relief_11);
    let _e577 = (*relief_11);
    let _e579 = zoneEdge_23;
    let _e581 = meniscus;
    let _e585 = (_e577.xy + ((_e579.yz * _e581) * 0.18f));
    (*relief_11).x = _e585.x;
    (*relief_11).y = _e585.y;
    return;
}

fn brakeMaterial(m_39: f32, p_91: vec3<f32>, n_31: vec3<f32>, extent_39: vec3<f32>, seed_50: f32, worldPoint_24: vec3<f32>, zoneEdge_24: vec3<f32>, albedo_12: ptr<function, vec3<f32>>, rough_12: ptr<function, f32>, spec_12: ptr<function, f32>, emit_12: ptr<function, vec3<f32>>, layers_12: ptr<function, vec4<f32>>, relief_12: ptr<function, vec3<f32>>) {
    var m_40: f32;
    var p_92: vec3<f32>;
    var n_32: vec3<f32>;
    var extent_40: vec3<f32>;
    var seed_51: f32;
    var worldPoint_25: vec3<f32>;
    var zoneEdge_25: vec3<f32>;
    var uv_13: vec2<f32>;
    var world_1: vec2<f32>;
    var delta_1: vec2<f32>;
    var time_1: f32;
    var speed_1: f32;
    var pull: vec2<f32>;
    var phase_4: vec2<f32>;
    var lobes: vec3<f32>;
    var rim_2: f32;
    var radius_4: f32;
    var separation: f32;
    var adhesion: f32;
    var bubble: f32 = 0f;
    var stretchLength: f32;
    var along_2: f32;
    var tether: vec2<f32>;
    var pullRidge: f32;

    m_40 = m_39;
    p_92 = p_91;
    n_32 = n_31;
    extent_40 = extent_39;
    seed_51 = seed_50;
    worldPoint_25 = worldPoint_24;
    zoneEdge_25 = zoneEdge_24;
    let _e221 = p_92;
    uv_13 = _e221.xz;
    let _e224 = worldPoint_25;
    world_1 = _e224.xz;
    let _e227 = world_1;
    let _e228 = uniforms;
    delta_1 = (_e227 - _e228.uCube.xy);
    let _e233 = effectTime();
    time_1 = _e233;
    let _e235 = uniforms;
    speed_1 = min(length(_e235.uCubeVelocity.xy), 3f);
    let _e242 = uniforms;
    let _e247 = uniforms;
    pull = ((_e242.uCubeVelocity.xy * 0.055f) * _e247.uSurfaceContact.z);
    let _e252 = uv_13;
    let _e253 = pull;
    let _e257 = seed_51;
    let _e260 = time_1;
    let _e266 = time_1;
    phase_4 = ((((_e252 - _e253) * 5.2f) + vec2(_e257)) + vec2<f32>((sin((_e260 * 0.32f)) * 0.09f), (cos((_e266 * 0.27f)) * 0.07f)));
    let _e276 = phase_4;
    let _e279 = phase_4;
    let _e286 = phase_4;
    let _e289 = phase_4;
    let _e295 = phase_4;
    let _e298 = phase_4;
    lobes = vec3<f32>((0.5f + ((sin(_e276.x) * sin(_e279.y)) * 0.25f)), ((cos(_e286.x) * sin(_e289.y)) * 0.25f), ((sin(_e295.x) * cos(_e298.y)) * 0.25f));
    let _e309 = zoneEdge_25;
    rim_2 = (1f - smoothstep(0.008f, 0.13f, _e309.x));
    let _e314 = delta_1;
    radius_4 = length(_e314);
    let _e317 = radius_4;
    separation = ((_e317 - 0.28f) / 0.11f);
    let _e323 = separation;
    let _e325 = separation;
    let _e328 = uniforms;
    let _e332 = uniforms;
    adhesion = ((exp((-(_e323) * _e325)) * _e328.uSurfaceContact.y) * _e332.uSurfaceContact.z);
    let _e339 = uniforms;
    stretchLength = length(_e339.uStickyStretch.xy);
    let _e344 = delta_1;
    let _e345 = uniforms;
    let _e349 = uniforms;
    let _e352 = uniforms;
    along_2 = clamp((dot(_e344, _e345.uStickyStretch.xy) / max(dot(_e349.uStickyStretch.xy, _e352.uStickyStretch.xy), 0.001f)), 0f, 1f);
    let _e363 = delta_1;
    let _e364 = uniforms;
    let _e367 = along_2;
    tether = (_e363 - (_e364.uStickyStretch.xy * _e367));
    let _e371 = tether;
    let _e372 = tether;
    let _e380 = stretchLength;
    let _e383 = uniforms;
    let _e387 = uniforms;
    pullRidge = (((exp((-(dot(_e371, _e372)) * 90f)) * smoothstep(0.04f, 0.25f, _e380)) * _e383.uSurfaceContact.y) * _e387.uSurfaceContact.z);
    let _e402 = lobes;
    (*albedo_12) = mix(vec3<f32>(0.2f, 0.014f, 0.33f), vec3<f32>(0.67f, 0.075f, 0.83f), vec3(smoothstep(0.22f, 0.78f, _e402.x)));
    let _e407 = (*albedo_12);
    let _e412 = rim_2;
    let _e415 = bubble;
    let _e419 = pullRidge;
    (*albedo_12) = mix(_e407, vec3<f32>(0.75f, 0.32f, 0.89f), vec3((((_e412 * 0.28f) + (_e415 * 0.34f)) + (_e419 * 0.2f))));
    let _e428 = lobes;
    (*rough_12) = (0.205f + (0.045f * (1f - _e428.x)));
    (*spec_12) = 0.42f;
    (*layers_12).y = 0.96f;
    (*layers_12).z = 0.18f;
    let _e438 = lobes;
    let _e447 = clamp((_e438.yz * 0.46f), vec2(-0.42f), vec2(0.42f));
    (*relief_12) = vec3<f32>(_e447.x, _e447.y, 0f);
    let _e452 = (*relief_12);
    let _e454 = (*relief_12);
    let _e456 = zoneEdge_25;
    let _e458 = rim_2;
    let _e462 = delta_1;
    let _e463 = radius_4;
    let _e468 = adhesion;
    let _e471 = speed_1;
    let _e477 = (_e454.xy + (((_e456.yz * _e458) * 0.29f) + (((_e462 / vec2(max(_e463, 0.03f))) * _e468) * (0.3f + (_e471 * 0.06f)))));
    (*relief_12).x = _e477.x;
    (*relief_12).y = _e477.y;
    let _e482 = (*relief_12);
    let _e484 = (*relief_12);
    let _e486 = uniforms;
    let _e489 = stretchLength;
    let _e494 = pullRidge;
    let _e498 = (_e484.xy + (((_e486.uStickyStretch.xy / vec2(max(_e489, 0.04f))) * _e494) * 0.28f));
    (*relief_12).x = _e498.x;
    (*relief_12).y = _e498.y;
    let _e507 = adhesion;
    let _e510 = pullRidge;
    (*emit_12) = (vec3<f32>(0.19f, 0.006f, 0.27f) * ((_e507 * 0.06f) + (_e510 * 0.035f)));
    return;
}

fn boostMaterial(m_41: f32, p_93: vec3<f32>, n_33: vec3<f32>, extent_41: vec3<f32>, seed_52: f32, worldPoint_26: vec3<f32>, zoneEdge_26: vec3<f32>, albedo_13: ptr<function, vec3<f32>>, rough_13: ptr<function, f32>, spec_13: ptr<function, f32>, emit_13: ptr<function, vec3<f32>>, layers_13: ptr<function, vec4<f32>>, relief_13: ptr<function, vec3<f32>>) {
    var m_42: f32;
    var p_94: vec3<f32>;
    var n_34: vec3<f32>;
    var extent_42: vec3<f32>;
    var seed_53: f32;
    var worldPoint_27: vec3<f32>;
    var zoneEdge_27: vec3<f32>;
    var current: vec4<f32>;
    var local_39: vec2<f32>;
    var dir_2: vec2<f32>;
    var crossFlow: vec2<f32>;
    var transported: vec2<f32>;
    var uv_14: vec2<f32>;
    var phase_5: f32;
    var dunes: vec3<f32>;
    var grains: vec3<f32>;
    var ripple_1: f32;
    var strata: f32;
    var slope_4: vec2<f32>;

    m_42 = m_41;
    p_94 = p_93;
    n_34 = n_33;
    extent_42 = extent_41;
    seed_53 = seed_52;
    worldPoint_27 = worldPoint_26;
    zoneEdge_27 = zoneEdge_26;
    let _e221 = seed_53;
    let _e222 = zoneFlow(_e221);
    current = _e222;
    let _e224 = current;
    let _e226 = current;
    if (dot(_e224.xy, _e226.xy) > 0.01f) {
        let _e231 = current;
        local_39 = _e231.xy;
    } else {
        local_39 = vec2<f32>(1f, 0f);
    }
    let _e239 = local_39;
    dir_2 = _e239;
    let _e241 = dir_2;
    let _e244 = dir_2;
    crossFlow = vec2<f32>(-(_e241.y), _e244.x);
    let _e248 = p_94;
    let _e250 = dir_2;
    let _e251 = uniforms;
    let _e255 = current;
    transported = (_e248.xz - ((_e250 * _e251.uTime.x) * _e255.z));
    let _e260 = transported;
    let _e261 = dir_2;
    let _e263 = transported;
    let _e264 = crossFlow;
    uv_14 = vec2<f32>(dot(_e260, _e261), dot(_e263, _e264));
    let _e268 = uv_14;
    let _e272 = uv_14;
    let _e278 = seed_53;
    phase_5 = (((_e268.y * 8f) + sin((_e272.x * 3.2f))) + _e278);
    let _e282 = phase_5;
    let _e288 = phase_5;
    dunes = vec3<f32>((0.5f + (sin(_e282) * 0.25f)), 0f, (cos(_e288) * 0.25f));
    let _e294 = uv_14;
    let _e297 = seed_53;
    let _e301 = materialNoise(((_e294 * 31f) + vec2(_e297)), 31f);
    grains = _e301;
    let _e305 = uv_14;
    let _e309 = dunes;
    ripple_1 = (0.5f + (0.5f * sin(((_e305.x * 18f) + (_e309.x * 3f)))));
    let _e319 = ripple_1;
    let _e322 = uniforms;
    strata = mix(0.5f, _e319, (0.42f + (0.33f * _e322.uLook.w)));
    let _e338 = strata;
    let _e342 = grains;
    let _e348 = uniforms;
    (*albedo_13) = mix(vec3<f32>(0.4f, 0.23f, 0.075f), vec3<f32>(0.94f, 0.71f, 0.36f), vec3(((0.25f + (_e338 * 0.5f)) + ((_e342.x - 0.5f) * (0.3f + (0.35f * _e348.uLook.w))))));
    let _e357 = (*albedo_13);
    let _e364 = grains;
    let _e368 = uniforms;
    (*albedo_13) = (_e357 + ((vec3<f32>(0.1f, 0.075f, 0.025f) * smoothstep(0.68f, 0.88f, _e364.x)) * _e368.uLook.w));
    let _e374 = grains;
    (*rough_13) = (0.79f + ((_e374.x - 0.5f) * 0.12f));
    (*spec_13) = 0.17f;
    let _e382 = uv_14;
    let _e386 = dunes;
    let _e394 = dunes;
    let _e399 = grains;
    let _e403 = uniforms;
    slope_4 = (vec2<f32>((cos(((_e382.x * 18f) + (_e386.x * 3f))) * 0.16f), (_e394.z * 0.13f)) + (_e399.yz * (0.035f + (0.055f * _e403.uLook.w))));
    let _e411 = dir_2;
    let _e412 = slope_4;
    let _e415 = crossFlow;
    let _e416 = slope_4;
    let _e419 = ((_e411 * _e412.x) + (_e415 * _e416.y));
    (*relief_13) = vec3<f32>(_e419.x, _e419.y, 0.001f);
    return;
}

fn platformMaterial(m_43: f32, p_95: vec3<f32>, n_35: vec3<f32>, extent_43: vec3<f32>, seed_54: f32, worldPoint_28: vec3<f32>, zoneEdge_28: vec3<f32>, albedo_14: ptr<function, vec3<f32>>, rough_14: ptr<function, f32>, spec_14: ptr<function, f32>, emit_14: ptr<function, vec3<f32>>, layers_14: ptr<function, vec4<f32>>, relief_14: ptr<function, vec3<f32>>) {
    var m_44: f32;
    var p_96: vec3<f32>;
    var n_36: vec3<f32>;
    var extent_44: vec3<f32>;
    var seed_55: f32;
    var worldPoint_29: vec3<f32>;
    var zoneEdge_29: vec3<f32>;
    var alongZ: bool;
    var uv_15: vec2<f32>;
    var identity_3: f32;
    var slope_5: vec2<f32>;
    var tissue_1: vec4<f32>;
    var side_3: f32;
    var local_40: f32;
    var endGrain: f32;
    var local_41: vec2<f32>;
    var endUV: vec2<f32>;
    var cut: f32;
    var growth: f32;
    var lamination: f32;

    m_44 = m_43;
    p_96 = p_95;
    n_36 = n_35;
    extent_44 = extent_43;
    seed_55 = seed_54;
    worldPoint_29 = worldPoint_28;
    zoneEdge_29 = zoneEdge_28;
    let _e221 = extent_44;
    let _e223 = extent_44;
    alongZ = (_e221.z >= _e223.x);
    let _e227 = p_96;
    let _e228 = n_36;
    let _e229 = faceUV(_e227, _e228);
    uv_15 = _e229;
    let _e231 = n_36;
    let _e236 = alongZ;
    if ((abs(_e231.y) > 0.5f) && !(_e236)) {
        let _e239 = uv_15;
        uv_15 = _e239.yx;
    }
    let _e241 = seed_55;
    let _e244 = hash(vec2<f32>(_e241, 3.2f));
    identity_3 = _e244;
    let _e247 = uv_15;
    let _e248 = identity_3;
    let _e254 = identity_3;
    let _e257 = woodAnatomy((_e247 + vec2<f32>((_e248 * 0.21f), 0f)), _e254, (&slope_5));
    tissue_1 = _e257;
    let _e262 = n_36;
    side_3 = (1f - smoothstep(0.4f, 0.9f, abs(_e262.y)));
    let _e268 = side_3;
    let _e269 = alongZ;
    if _e269 {
        let _e270 = n_36;
        local_40 = abs(_e270.z);
    } else {
        let _e273 = n_36;
        local_40 = abs(_e273.x);
    }
    let _e277 = local_40;
    endGrain = (_e268 * _e277);
    let _e280 = alongZ;
    if _e280 {
        let _e281 = p_96;
        local_41 = _e281.xy;
    } else {
        let _e283 = p_96;
        local_41 = _e283.zy;
    }
    let _e286 = local_41;
    endUV = _e286;
    let _e288 = endUV;
    let _e296 = identity_3;
    let _e302 = woodRingFilter(((length((_e288 * vec2<f32>(1f, 1.8f))) * 25f) + (_e296 * 3f)), 45f, 0.24f);
    cut = _e302;
    let _e304 = tissue_1;
    let _e306 = cut;
    let _e307 = endGrain;
    growth = mix(_e304.x, _e306, _e307);
    let _e310 = p_96;
    let _e312 = extent_44;
    let _e317 = filteredStripe((_e310.y + _e312.y), 0.09f, 0.004f);
    let _e318 = side_3;
    lamination = (_e317 * _e318);
    let _e329 = identity_3;
    let _e333 = growth;
    let _e339 = tissue_1;
    let _e344 = tissue_1;
    let _e349 = tissue_1;
    let _e354 = lamination;
    (*albedo_14) = (mix(vec3<f32>(0.55f, 0.355f, 0.188f), vec3<f32>(0.63f, 0.418f, 0.236f), vec3(_e329)) * (((((1f - ((_e333 - 0.19f) * 0.23f)) + (_e339.y * 0.07f)) + (_e344.w * 0.12f)) - (_e349.z * 0.16f)) - (_e354 * 0.1f)));
    let _e360 = growth;
    let _e364 = tissue_1;
    let _e369 = endGrain;
    (*rough_14) = (((0.585f + (_e360 * 0.025f)) + (_e364.z * 0.055f)) + (_e369 * 0.035f));
    (*spec_14) = 0.2f;
    let _e374 = uv_15;
    let _e379 = microRelief(_e374, vec2<f32>(25f, 4f), 0.018f);
    (*relief_14) = _e379;
    let _e380 = (*relief_14);
    let _e382 = (*relief_14);
    let _e384 = slope_5;
    let _e386 = endGrain;
    let _e389 = (_e382.xy + (_e384 * (1f - _e386)));
    (*relief_14).x = _e389.x;
    (*relief_14).y = _e389.y;
    let _e394 = n_36;
    let _e399 = alongZ;
    if ((abs(_e394.y) > 0.5f) && !(_e399)) {
        let _e402 = (*relief_14);
        let _e404 = (*relief_14);
        let _e405 = _e404.yx;
        (*relief_14).x = _e405.x;
        (*relief_14).y = _e405.y;
        return;
    } else {
        return;
    }
}

fn jumpMaterial(m_45: f32, p_97: vec3<f32>, n_37: vec3<f32>, extent_45: vec3<f32>, seed_56: f32, worldPoint_30: vec3<f32>, zoneEdge_30: vec3<f32>, albedo_15: ptr<function, vec3<f32>>, rough_15: ptr<function, f32>, spec_15: ptr<function, f32>, emit_15: ptr<function, vec3<f32>>, layers_15: ptr<function, vec4<f32>>, relief_15: ptr<function, vec3<f32>>) {
    var m_46: f32;
    var p_98: vec3<f32>;
    var n_38: vec3<f32>;
    var extent_46: vec3<f32>;
    var seed_57: f32;
    var worldPoint_31: vec3<f32>;
    var zoneEdge_31: vec3<f32>;
    var spring: vec4<f32>;
    var radial: f32;
    var strain: f32;
    var shoulder: f32;
    var ribs: f32;
    var pulse: f32;

    m_46 = m_45;
    p_98 = p_97;
    n_38 = n_37;
    extent_46 = extent_45;
    seed_57 = seed_56;
    worldPoint_31 = worldPoint_30;
    zoneEdge_31 = zoneEdge_30;
    let _e221 = seed_57;
    let _e222 = zoneMotionAt(_e221);
    spring = _e222;
    let _e224 = p_98;
    let _e227 = extent_46;
    radial = (length(_e224.xz) / max(_e227.x, 0.01f));
    let _e233 = spring;
    strain = max(_e233.x, 0f);
    let _e240 = radial;
    shoulder = smoothstep(0.52f, 0.96f, _e240);
    let _e243 = p_98;
    let _e248 = filteredStripe(length(_e243.xz), 0.105f, 0.007f);
    ribs = _e248;
    let _e250 = radial;
    let _e253 = effectTime();
    let _e258 = spring;
    let _e266 = uniforms;
    pulse = ((sin(((_e250 * 18f) - (_e253 * 10f))) * min((abs(_e258.y) * 0.15f), 1f)) * _e266.uLook.w);
    let _e280 = shoulder;
    (*albedo_15) = mix(vec3<f32>(0.035f, 0.34f, 0.38f), vec3<f32>(0.12f, 0.77f, 0.8f), vec3((1f - (_e280 * 0.72f))));
    let _e286 = (*albedo_15);
    let _e288 = ribs;
    (*albedo_15) = (_e286 * (1f - (_e288 * 0.1f)));
    let _e293 = (*albedo_15);
    let _e298 = strain;
    let _e301 = pulse;
    (*albedo_15) = (_e293 + (vec3<f32>(0.06f, 0.13f, 0.12f) * ((_e298 * 0.7f) + (_e301 * 0.08f))));
    (*rough_15) = 0.43f;
    (*spec_15) = 0.3f;
    (*layers_15).y = 0.32f;
    (*layers_15).z = 0.28f;
    let _e313 = p_98;
    let _e315 = p_98;
    let _e322 = pulse;
    let _e325 = (((_e313.xz / vec2(max(length(_e315.xz), 0.03f))) * _e322) * 0.035f);
    (*relief_15) = vec3<f32>(_e325.x, _e325.y, 0f);
    let _e334 = strain;
    (*emit_15) = ((vec3<f32>(0.015f, 0.22f, 0.24f) * _e334) * 0.12f);
    return;
}

fn bumperMaterial(m_47: f32, p_99: vec3<f32>, n_39: vec3<f32>, extent_47: vec3<f32>, seed_58: f32, worldPoint_32: vec3<f32>, zoneEdge_32: vec3<f32>, albedo_16: ptr<function, vec3<f32>>, rough_16: ptr<function, f32>, spec_16: ptr<function, f32>, emit_16: ptr<function, vec3<f32>>, layers_16: ptr<function, vec4<f32>>, relief_16: ptr<function, vec3<f32>>) {
    var m_48: f32;
    var p_100: vec3<f32>;
    var n_40: vec3<f32>;
    var extent_48: vec3<f32>;
    var seed_59: f32;
    var worldPoint_33: vec3<f32>;
    var zoneEdge_33: vec3<f32>;
    var uv_16: vec2<f32>;
    var jelly: vec4<f32>;
    var body: f32;
    var bubbles: f32 = 0f;
    var base: f32;

    m_48 = m_47;
    p_100 = p_99;
    n_40 = n_39;
    extent_48 = extent_47;
    seed_59 = seed_58;
    worldPoint_33 = worldPoint_32;
    zoneEdge_33 = zoneEdge_32;
    let _e221 = p_100;
    let _e222 = n_40;
    let _e223 = faceUV(_e221, _e222);
    uv_16 = _e223;
    let _e225 = seed_59;
    let _e226 = jellyState(_e225);
    jelly = _e226;
    let _e229 = uv_16;
    let _e233 = seed_59;
    let _e236 = uv_16;
    let _e240 = seed_59;
    body = (0.5f + ((sin(((_e229.x * 4.5f) + _e233)) * sin(((_e236.y * 4.5f) + _e240))) * 0.25f));
    let _e251 = extent_48;
    let _e254 = extent_48;
    let _e259 = p_100;
    base = (1f - smoothstep(-(_e251.y), (-(_e254.y) + 0.06f), _e259.y));
    let _e272 = body;
    let _e275 = bubbles;
    (*albedo_16) = mix(vec3<f32>(0.62f, 0.025f, 0.018f), vec3<f32>(0.91f, 0.15f, 0.065f), vec3(((_e272 * 0.55f) + (_e275 * 0.22f))));
    let _e281 = (*albedo_16);
    let _e283 = base;
    (*albedo_16) = (_e281 * (1f - (_e283 * 0.22f)));
    let _e289 = body;
    (*rough_16) = (0.205f + (_e289 * 0.055f));
    (*spec_16) = 0.37f;
    (*layers_16).y = 0.78f;
    (*layers_16).z = 0.185f;
    let _e298 = uv_16;
    let _e303 = microRelief(_e298, vec2<f32>(7f, 7f), 0.006f);
    (*relief_16) = _e303;
    let _e304 = (*albedo_16);
    let _e309 = jelly;
    let _e317 = uniforms;
    (*albedo_16) = (_e304 + ((vec3<f32>(0.08f, 0.018f, 0.012f) * min((abs(_e309.y) * 0.2f), 1f)) * _e317.uLook.w));
    return;
}

fn surfaceMaterial(m_49: f32, p_101: vec3<f32>, geometric: vec3<f32>, albedo_17: ptr<function, vec3<f32>>, rough_17: ptr<function, f32>, spec_17: ptr<function, f32>, emit_17: ptr<function, vec3<f32>>, layers_17: ptr<function, vec4<f32>>, normal_3: ptr<function, vec3<f32>>) {
    var m_50: f32;
    var p_102: vec3<f32>;
    var geometric_1: vec3<f32>;
    var q_16: vec3<f32>;
    var extent_49: vec3<f32>;
    var relief_17: vec3<f32> = vec3(0f);
    var ng: vec3<f32>;
    var seed_60: f32;
    var edge_2: vec3<f32> = vec3<f32>(1f, 0f, 0f);
    var cube: bool;
    var a_8: vec3<f32>;
    var t_5: vec3<f32>;
    var b_11: vec3<f32>;
    var slope_6: vec3<f32>;
    var gradient_3: vec3<f32>;
    var paint_1: vec4<f32>;

    m_50 = m_49;
    p_102 = p_101;
    geometric_1 = geometric;
    let _e219 = geometric_1;
    ng = _e219;
    let _e222 = m_50;
    let _e223 = p_102;
    materialCoordinates(_e222, _e223, (&q_16), (&extent_49), (&seed_60));
    let _e238 = m_50;
    let _e241 = m_50;
    if ((_e238 > 15.5f) && (_e241 < 17.5f)) {
        let _e245 = q_16;
        let _e247 = extent_49;
        let _e248 = seed_60;
        let _e249 = zoneEdgeInfo(_e245.xz, _e247, _e248);
        edge_2 = _e249;
    }
    let _e250 = m_50;
    let _e253 = m_50;
    cube = ((_e250 > 6.5f) && (_e253 < 7.5f));
    let _e258 = cube;
    if _e258 {
        let _e259 = uniforms;
        let _e262 = -(_e259.uCubeQ.xyz);
        let _e263 = uniforms;
        let _e270 = geometric_1;
        let _e271 = qrot(vec4<f32>(_e262.x, _e262.y, _e262.z, _e263.uCubeQ.w), _e270);
        ng = _e271;
    }
    (*albedo_17) = vec3(0.65f);
    (*rough_17) = 0.65f;
    (*spec_17) = 0.2f;
    (*emit_17) = vec3(0f);
    (*layers_17) = vec4<f32>(0f, 0f, 0.3f, 0f);
    let _e287 = m_50;
    if (_e287 < 1.5f) {
        let _e290 = m_50;
        let _e291 = q_16;
        let _e292 = ng;
        let _e293 = extent_49;
        let _e294 = seed_60;
        let _e295 = p_102;
        let _e296 = edge_2;
        woodMaterial(_e290, _e291, _e292, _e293, _e294, _e295, _e296, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
    } else {
        let _e309 = m_50;
        if (_e309 < 2.5f) {
            let _e312 = m_50;
            let _e313 = q_16;
            let _e314 = ng;
            let _e315 = extent_49;
            let _e316 = seed_60;
            let _e317 = p_102;
            let _e318 = edge_2;
            carpetMaterial(_e312, _e313, _e314, _e315, _e316, _e317, _e318, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
        } else {
            let _e331 = m_50;
            if (_e331 < 6.5f) {
                let _e334 = m_50;
                let _e335 = q_16;
                let _e336 = ng;
                let _e337 = extent_49;
                let _e338 = seed_60;
                let _e339 = p_102;
                let _e340 = edge_2;
                wallMaterial(_e334, _e335, _e336, _e337, _e338, _e339, _e340, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
            } else {
                let _e353 = m_50;
                if (_e353 < 7.5f) {
                    let _e356 = m_50;
                    let _e357 = q_16;
                    let _e358 = ng;
                    let _e359 = extent_49;
                    let _e360 = seed_60;
                    let _e361 = p_102;
                    let _e362 = edge_2;
                    cubeMaterial(_e356, _e357, _e358, _e359, _e360, _e361, _e362, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                } else {
                    let _e375 = m_50;
                    if (_e375 < 8.5f) {
                        let _e378 = m_50;
                        let _e379 = q_16;
                        let _e380 = ng;
                        let _e381 = extent_49;
                        let _e382 = seed_60;
                        let _e383 = p_102;
                        let _e384 = edge_2;
                        obstacleMaterial(_e378, _e379, _e380, _e381, _e382, _e383, _e384, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                    } else {
                        let _e397 = m_50;
                        if (_e397 < 10.5f) {
                            let _e400 = m_50;
                            let _e401 = q_16;
                            let _e402 = ng;
                            let _e403 = extent_49;
                            let _e404 = seed_60;
                            let _e405 = p_102;
                            let _e406 = edge_2;
                            greenGoalMaterial(_e400, _e401, _e402, _e403, _e404, _e405, _e406, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                        } else {
                            let _e419 = m_50;
                            if (_e419 < 11.5f) {
                                let _e422 = m_50;
                                let _e423 = q_16;
                                let _e424 = ng;
                                let _e425 = extent_49;
                                let _e426 = seed_60;
                                let _e427 = p_102;
                                let _e428 = edge_2;
                                blueGoalMaterial(_e422, _e423, _e424, _e425, _e426, _e427, _e428, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                            } else {
                                let _e441 = m_50;
                                if (_e441 < 12.5f) {
                                    let _e444 = m_50;
                                    let _e445 = q_16;
                                    let _e446 = ng;
                                    let _e447 = extent_49;
                                    let _e448 = seed_60;
                                    let _e449 = p_102;
                                    let _e450 = edge_2;
                                    ringMaterial(_e444, _e445, _e446, _e447, _e448, _e449, _e450, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                } else {
                                    let _e463 = m_50;
                                    if (_e463 < 13.5f) {
                                        let _e466 = m_50;
                                        let _e467 = q_16;
                                        let _e468 = ng;
                                        let _e469 = extent_49;
                                        let _e470 = seed_60;
                                        let _e471 = p_102;
                                        let _e472 = edge_2;
                                        lightMaterial(_e466, _e467, _e468, _e469, _e470, _e471, _e472, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                    } else {
                                        let _e485 = m_50;
                                        if (_e485 < 14.5f) {
                                            let _e488 = m_50;
                                            let _e489 = q_16;
                                            let _e490 = ng;
                                            let _e491 = extent_49;
                                            let _e492 = seed_60;
                                            let _e493 = p_102;
                                            let _e494 = edge_2;
                                            trimMaterial(_e488, _e489, _e490, _e491, _e492, _e493, _e494, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                        } else {
                                            let _e507 = m_50;
                                            if (_e507 < 15.5f) {
                                                let _e510 = m_50;
                                                let _e511 = q_16;
                                                let _e512 = ng;
                                                let _e513 = extent_49;
                                                let _e514 = seed_60;
                                                let _e515 = p_102;
                                                let _e516 = edge_2;
                                                portalMaterial(_e510, _e511, _e512, _e513, _e514, _e515, _e516, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                            } else {
                                                let _e529 = m_50;
                                                if (_e529 < 16.5f) {
                                                    let _e532 = m_50;
                                                    let _e533 = q_16;
                                                    let _e534 = ng;
                                                    let _e535 = extent_49;
                                                    let _e536 = seed_60;
                                                    let _e537 = p_102;
                                                    let _e538 = edge_2;
                                                    iceMaterial(_e532, _e533, _e534, _e535, _e536, _e537, _e538, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                } else {
                                                    let _e551 = m_50;
                                                    if (_e551 < 17.5f) {
                                                        let _e554 = m_50;
                                                        let _e555 = q_16;
                                                        let _e556 = ng;
                                                        let _e557 = extent_49;
                                                        let _e558 = seed_60;
                                                        let _e559 = p_102;
                                                        let _e560 = edge_2;
                                                        brakeMaterial(_e554, _e555, _e556, _e557, _e558, _e559, _e560, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                    } else {
                                                        let _e573 = m_50;
                                                        if (_e573 < 18.5f) {
                                                            let _e576 = m_50;
                                                            let _e577 = q_16;
                                                            let _e578 = ng;
                                                            let _e579 = extent_49;
                                                            let _e580 = seed_60;
                                                            let _e581 = p_102;
                                                            let _e582 = edge_2;
                                                            boostMaterial(_e576, _e577, _e578, _e579, _e580, _e581, _e582, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                        } else {
                                                            let _e595 = m_50;
                                                            if (_e595 < 19.5f) {
                                                                let _e598 = m_50;
                                                                let _e599 = q_16;
                                                                let _e600 = ng;
                                                                let _e601 = extent_49;
                                                                let _e602 = seed_60;
                                                                let _e603 = p_102;
                                                                let _e604 = edge_2;
                                                                platformMaterial(_e598, _e599, _e600, _e601, _e602, _e603, _e604, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                            } else {
                                                                let _e617 = m_50;
                                                                if (_e617 < 20.5f) {
                                                                    let _e620 = m_50;
                                                                    let _e621 = q_16;
                                                                    let _e622 = ng;
                                                                    let _e623 = extent_49;
                                                                    let _e624 = seed_60;
                                                                    let _e625 = p_102;
                                                                    let _e626 = edge_2;
                                                                    jumpMaterial(_e620, _e621, _e622, _e623, _e624, _e625, _e626, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                                } else {
                                                                    let _e639 = m_50;
                                                                    let _e640 = q_16;
                                                                    let _e641 = ng;
                                                                    let _e642 = extent_49;
                                                                    let _e643 = seed_60;
                                                                    let _e644 = p_102;
                                                                    let _e645 = edge_2;
                                                                    bumperMaterial(_e639, _e640, _e641, _e642, _e643, _e644, _e645, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    let _e658 = ng;
    a_8 = abs(_e658);
    let _e663 = a_8;
    let _e665 = a_8;
    let _e667 = a_8;
    if (_e663.y >= max(_e665.x, _e667.z)) {
        {
            t_5 = vec3<f32>(1f, 0f, 0f);
            b_11 = vec3<f32>(0f, 0f, 1f);
        }
    } else {
        let _e685 = a_8;
        let _e687 = a_8;
        if (_e685.x >= _e687.z) {
            {
                t_5 = vec3<f32>(0f, 0f, 1f);
                b_11 = vec3<f32>(0f, 1f, 0f);
            }
        } else {
            {
                t_5 = vec3<f32>(1f, 0f, 0f);
                b_11 = vec3<f32>(0f, 1f, 0f);
            }
        }
    }
    let _e718 = t_5;
    let _e719 = relief_17;
    let _e722 = b_11;
    let _e723 = relief_17;
    slope_6 = ((_e718 * _e719.x) + (_e722 * _e723.y));
    let _e728 = slope_6;
    let _e729 = ng;
    let _e730 = ng;
    let _e731 = slope_6;
    slope_6 = (_e728 - (_e729 * dot(_e730, _e731)));
    let _e735 = m_50;
    let _e736 = q_16;
    let _e737 = extent_49;
    let _e738 = seed_60;
    let _e739 = reliefGradient(_e735, _e736, _e737, _e738);
    gradient_3 = _e739;
    let _e741 = gradient_3;
    let _e742 = ng;
    let _e743 = ng;
    let _e744 = gradient_3;
    gradient_3 = (_e741 - (_e742 * dot(_e743, _e744)));
    let _e748 = ng;
    let _e749 = slope_6;
    let _e751 = gradient_3;
    (*normal_3) = normalize(((_e748 - _e749) + _e751));
    let _e754 = cube;
    if _e754 {
        let _e755 = uniforms;
        let _e757 = (*normal_3);
        let _e758 = qrot(_e755.uCubeQ, _e757);
        (*normal_3) = _e758;
    }
    let _e759 = m_50;
    let _e760 = q_16;
    let _e761 = extent_49;
    let _e762 = seed_60;
    let _e763 = materialVertexColor(_e759, _e760, _e761, _e762);
    paint_1 = _e763;
    let _e765 = (*rough_17);
    let _e766 = paint_1;
    (*rough_17) = (_e765 + (_e766.w * 0.025f));
    let _e772 = (*layers_17);
    let _e775 = paint_1;
    (*layers_17).y = (_e772.y * (1f - (_e775.w * 0.08f)));
    let _e781 = (*rough_17);
    let _e782 = (*rough_17);
    let _e784 = relief_17;
    (*rough_17) = clamp(sqrt(((_e781 * _e782) + (_e784.z * 2f))), 0.18f, 1f);
    let _e793 = (*albedo_17);
    let _e802 = paint_1;
    (*albedo_17) = (pow(clamp(_e793, vec3(0.001f), vec3(0.95f)), vec3(2.2f)) * _e802.xyz);
    return;
}

fn material(m_51: f32, p_103: vec3<f32>, n_41: vec3<f32>, albedo_18: ptr<function, vec3<f32>>, rough_18: ptr<function, f32>, spec_18: ptr<function, f32>, emit_18: ptr<function, vec3<f32>>) {
    var m_52: f32;
    var p_104: vec3<f32>;
    var n_42: vec3<f32>;
    var layers_18: vec4<f32>;
    var normal_4: vec3<f32>;

    m_52 = m_51;
    p_104 = p_103;
    n_42 = n_41;
    let _e213 = m_52;
    let _e214 = p_104;
    let _e215 = n_42;
    surfaceMaterial(_e213, _e214, _e215, albedo_18, rough_18, spec_18, emit_18, (&layers_18), (&normal_4));
    return;
}

fn detailNormal(m_53: f32, p_105: vec3<f32>, geometric_2: vec3<f32>) -> vec3<f32> {
    var m_54: f32;
    var p_106: vec3<f32>;
    var geometric_3: vec3<f32>;
    var albedo_19: vec3<f32>;
    var emit_19: vec3<f32>;
    var normal_5: vec3<f32>;
    var rough_19: f32;
    var spec_19: f32;
    var layers_19: vec4<f32>;

    m_54 = m_53;
    p_106 = p_105;
    geometric_3 = geometric_2;
    let _e213 = m_54;
    let _e214 = p_106;
    let _e215 = geometric_3;
    surfaceMaterial(_e213, _e214, _e215, (&albedo_19), (&rough_19), (&spec_19), (&emit_19), (&layers_19), (&normal_5));
    let _e228 = normal_5;
    return _e228;
}

fn fresnelSchlick(f0_: vec3<f32>, cosine: f32) -> vec3<f32> {
    var f0_1: vec3<f32>;
    var cosine_1: f32;
    var x_4: f32;
    var x2_: f32;

    f0_1 = f0_;
    cosine_1 = cosine;
    let _e206 = cosine_1;
    x_4 = clamp((1f - _e206), 0f, 1f);
    let _e212 = x_4;
    let _e213 = x_4;
    x2_ = (_e212 * _e213);
    let _e216 = f0_1;
    let _e218 = f0_1;
    let _e221 = x2_;
    let _e223 = x2_;
    let _e225 = x_4;
    return (_e216 + ((((vec3(1f) - _e218) * _e221) * _e223) * _e225));
}

fn distributionGGX(nh: f32, rough_20: f32) -> f32 {
    var nh_1: f32;
    var rough_21: f32;
    var a_9: f32;
    var a2_: f32;
    var d_16: f32;

    nh_1 = nh;
    rough_21 = rough_20;
    let _e205 = rough_21;
    let _e206 = rough_21;
    a_9 = max((_e205 * _e206), 0.045f);
    let _e211 = a_9;
    let _e212 = a_9;
    a2_ = (_e211 * _e212);
    let _e215 = nh_1;
    let _e216 = nh_1;
    let _e218 = a2_;
    d_16 = (((_e215 * _e216) * (_e218 - 1f)) + 1f);
    let _e225 = a2_;
    let _e226 = d_16;
    let _e228 = d_16;
    return (_e225 / max(((PI * _e226) * _e228), 0.00005f));
}

fn smithG1_(cosine_2: f32, rough_22: f32) -> f32 {
    var cosine_3: f32;
    var rough_23: f32;
    var k: f32;

    cosine_3 = cosine_2;
    rough_23 = rough_22;
    let _e205 = rough_23;
    let _e208 = rough_23;
    k = (((_e205 + 1f) * (_e208 + 1f)) * 0.125f);
    let _e215 = cosine_3;
    let _e216 = cosine_3;
    let _e218 = k;
    let _e221 = k;
    return (_e215 / max(((_e216 * (1f - _e218)) + _e221), 0.001f));
}

fn roomBounce(p_107: vec3<f32>, n_43: vec3<f32>) -> vec3<f32> {
    var p_108: vec3<f32>;
    var n_44: vec3<f32>;
    var hemi: vec3<f32>;
    var floorNear: f32;
    var side_4: f32;
    var cubeDelta: vec3<f32>;

    p_108 = p_107;
    n_44 = n_43;
    let _e213 = n_44;
    hemi = mix(vec3<f32>(0.055f, 0.066f, 0.08f), vec3<f32>(0.14f, 0.16f, 0.18f), vec3(((_e213.y * 0.5f) + 0.5f)));
    let _e222 = p_108;
    floorNear = exp((-(max(_e222.y, 0f)) * 0.65f));
    let _e232 = n_44;
    side_4 = (1f - abs(_e232.y));
    let _e237 = hemi;
    let _e242 = floorNear;
    let _e244 = n_44;
    let _e249 = side_4;
    hemi = (_e237 + ((vec3<f32>(0.095f, 0.063f, 0.032f) * _e242) * (max(-(_e244.y), 0f) + (_e249 * 0.45f))));
    let _e255 = hemi;
    let _e260 = p_108;
    let _e271 = n_44;
    hemi = (_e255 + ((vec3<f32>(0.022f, 0.049f, 0.014f) * exp((-(max((_e260.x + 3.18f), 0f)) * 0.6f))) * max(-(_e271.x), 0f)));
    let _e278 = hemi;
    let _e284 = p_108;
    let _e294 = n_44;
    hemi = (_e278 + ((vec3<f32>(0.075f, 0.073f, 0.063f) * exp((-(max((3.18f - _e284.x), 0f)) * 0.6f))) * max(_e294.x, 0f)));
    let _e300 = hemi;
    let _e305 = p_108;
    let _e316 = n_44;
    hemi = (_e300 + ((vec3<f32>(0.048f, 0.031f, 0.012f) * exp((-(max((_e305.z + 3.18f), 0f)) * 0.6f))) * max(-(_e316.z), 0f)));
    let _e323 = cubeCenter();
    let _e324 = p_108;
    cubeDelta = (_e323 - _e324);
    let _e327 = hemi;
    let _e332 = cubeScale();
    let _e334 = n_44;
    let _e335 = cubeDelta;
    let _e346 = cubeDelta;
    let _e347 = cubeDelta;
    hemi = (_e327 + (((vec3<f32>(0.032f, 0.0015f, 0.0008f) * _e332) * max(dot(_e334, normalize((_e335 + vec3(0.0001f)))), 0f)) / vec3((1f + (12f * dot(_e346, _e347))))));
    let _e354 = hemi;
    return _e354;
}

fn direct(p_109: vec3<f32>, n_45: vec3<f32>, v_3: vec3<f32>, lp: vec3<f32>, radiance: vec3<f32>, power: f32, rough_24: f32, f0_2: vec3<f32>, albedo_20: vec3<f32>, metallic: f32, visibility_2: f32, coat: f32, coatRough: f32, coatNormal: vec3<f32>) -> vec3<f32> {
    var p_110: vec3<f32>;
    var n_46: vec3<f32>;
    var v_4: vec3<f32>;
    var lp_1: vec3<f32>;
    var radiance_1: vec3<f32>;
    var power_1: f32;
    var rough_25: f32;
    var f0_3: vec3<f32>;
    var albedo_21: vec3<f32>;
    var metallic_1: f32;
    var visibility_3: f32;
    var coat_1: f32;
    var coatRough_1: f32;
    var coatNormal_1: vec3<f32>;
    var l: vec3<f32>;
    var d2_: f32;
    var nl: f32;
    var nv: f32;
    var h_11: vec3<f32>;
    var nh_2: f32;
    var vh: f32;
    var r_12: f32;
    var f_5: vec3<f32>;
    var diffuse: vec3<f32>;
    var specular: vec3<f32>;
    var cnl: f32;
    var cnv: f32;
    var cnh: f32;
    var cf: f32;
    var cr: f32;
    var coating: f32;
    var fv: f32;
    var fl: f32;
    var transmission_1: f32;

    p_110 = p_109;
    n_46 = n_45;
    v_4 = v_3;
    lp_1 = lp;
    radiance_1 = radiance;
    power_1 = power;
    rough_25 = rough_24;
    f0_3 = f0_2;
    albedo_21 = albedo_20;
    metallic_1 = metallic;
    visibility_3 = visibility_2;
    coat_1 = coat;
    coatRough_1 = coatRough;
    coatNormal_1 = coatNormal;
    let _e229 = lp_1;
    let _e230 = p_110;
    l = (_e229 - _e230);
    let _e233 = l;
    let _e234 = l;
    d2_ = dot(_e233, _e234);
    let _e237 = l;
    let _e238 = d2_;
    l = (_e237 * inverseSqrt(max(_e238, 0.001f)));
    let _e243 = n_46;
    let _e244 = l;
    nl = max(dot(_e243, _e244), 0f);
    let _e249 = n_46;
    let _e250 = v_4;
    nv = max(dot(_e249, _e250), 0.001f);
    let _e255 = l;
    let _e256 = v_4;
    h_11 = normalize((_e255 + _e256));
    let _e260 = n_46;
    let _e261 = h_11;
    nh_2 = max(dot(_e260, _e261), 0f);
    let _e266 = v_4;
    let _e267 = h_11;
    vh = max(dot(_e266, _e267), 0f);
    let _e272 = rough_25;
    let _e273 = rough_25;
    let _e276 = d2_;
    r_12 = sqrt(((_e272 * _e273) + (0.008f / max(_e276, 0.1f))));
    let _e283 = f0_3;
    let _e284 = vh;
    let _e285 = fresnelSchlick(_e283, _e284);
    f_5 = _e285;
    let _e288 = f_5;
    let _e292 = metallic_1;
    let _e295 = albedo_21;
    diffuse = ((((vec3(1f) - _e288) * (1f - _e292)) * _e295) / vec3(3.1415927f));
    let _e301 = nh_2;
    let _e302 = r_12;
    let _e303 = distributionGGX(_e301, _e302);
    let _e304 = nl;
    let _e305 = r_12;
    let _e306 = smithG1_(_e304, _e305);
    let _e308 = nv;
    let _e309 = r_12;
    let _e310 = smithG1_(_e308, _e309);
    let _e312 = f_5;
    let _e315 = nl;
    let _e317 = nv;
    specular = ((((_e303 * _e306) * _e310) * _e312) / vec3(max(((4f * _e315) * _e317), 0.001f)));
    let _e324 = coatNormal_1;
    let _e325 = l;
    cnl = max(dot(_e324, _e325), 0f);
    let _e330 = coatNormal_1;
    let _e331 = v_4;
    cnv = max(dot(_e330, _e331), 0.001f);
    let _e336 = coatNormal_1;
    let _e337 = h_11;
    cnh = max(dot(_e336, _e337), 0f);
    let _e344 = vh;
    let _e345 = fresnelSchlick(vec3(0.04f), _e344);
    cf = _e345.x;
    let _e348 = coatRough_1;
    let _e349 = coatRough_1;
    let _e352 = d2_;
    cr = sqrt(((_e348 * _e349) + (0.008f / max(_e352, 0.1f))));
    let _e359 = cnh;
    let _e360 = cr;
    let _e361 = distributionGGX(_e359, _e360);
    let _e362 = cnl;
    let _e363 = cr;
    let _e364 = smithG1_(_e362, _e363);
    let _e366 = cnv;
    let _e367 = cr;
    let _e368 = smithG1_(_e366, _e367);
    let _e370 = cf;
    let _e373 = cnl;
    let _e375 = cnv;
    coating = ((((_e361 * _e364) * _e368) * _e370) / max(((4f * _e373) * _e375), 0.001f));
    let _e383 = cnv;
    let _e384 = fresnelSchlick(vec3(0.04f), _e383);
    fv = _e384.x;
    let _e389 = cnl;
    let _e390 = fresnelSchlick(vec3(0.04f), _e389);
    fl = _e390.x;
    let _e394 = coat_1;
    let _e395 = fv;
    let _e399 = coat_1;
    let _e400 = fl;
    transmission_1 = ((1f - (_e394 * _e395)) * (1f - (_e399 * _e400)));
    let _e405 = diffuse;
    let _e406 = transmission_1;
    diffuse = (_e405 * _e406);
    let _e408 = specular;
    let _e409 = transmission_1;
    let _e411 = coat_1;
    let _e412 = coating;
    let _e414 = cnl;
    let _e416 = nl;
    specular = ((_e408 * _e409) + vec3((((_e411 * _e412) * _e414) / max(_e416, 0.001f))));
    let _e422 = diffuse;
    let _e423 = specular;
    let _e425 = radiance_1;
    let _e427 = power_1;
    let _e429 = nl;
    let _e431 = visibility_3;
    let _e435 = d2_;
    return ((((((_e422 + _e423) * _e425) * _e427) * _e429) * _e431) / vec3((1f + (0.11f * _e435))));
}

fn stripLighting(p_111: vec3<f32>, n_47: vec3<f32>, v_5: vec3<f32>, start: vec3<f32>, end: vec3<f32>, color: vec3<f32>, power_2: f32, rough_26: f32, f0_4: vec3<f32>, albedo_22: vec3<f32>, metallic_2: f32, visibility_4: f32, coat_2: f32, coatRough_2: f32, coatNormal_2: vec3<f32>) -> vec3<f32> {
    var p_112: vec3<f32>;
    var n_48: vec3<f32>;
    var v_6: vec3<f32>;
    var start_1: vec3<f32>;
    var end_1: vec3<f32>;
    var color_1: vec3<f32>;
    var power_3: f32;
    var rough_27: f32;
    var f0_5: vec3<f32>;
    var albedo_23: vec3<f32>;
    var metallic_3: f32;
    var visibility_5: f32;
    var coat_3: f32;
    var coatRough_3: f32;
    var coatNormal_3: vec3<f32>;
    var radiance_2: vec3<f32> = vec3(0f);
    var i_9: i32 = 0i;
    var local_42: f32;
    var position: f32;

    p_112 = p_111;
    n_48 = n_47;
    v_6 = v_5;
    start_1 = start;
    end_1 = end;
    color_1 = color;
    power_3 = power_2;
    rough_27 = rough_26;
    f0_5 = f0_4;
    albedo_23 = albedo_22;
    metallic_3 = metallic_2;
    visibility_5 = visibility_4;
    coat_3 = coat_2;
    coatRough_3 = coatRough_2;
    coatNormal_3 = coatNormal_2;
    loop {
        let _e237 = i_9;
        if !((_e237 < 2i)) {
            break;
        }
        {
            let _e244 = i_9;
            if (_e244 == 0i) {
                local_42 = 0.21132487f;
            } else {
                local_42 = 0.7886751f;
            }
            let _e250 = local_42;
            position = _e250;
            let _e252 = radiance_2;
            let _e253 = p_112;
            let _e254 = n_48;
            let _e255 = v_6;
            let _e256 = start_1;
            let _e257 = end_1;
            let _e258 = position;
            let _e261 = color_1;
            let _e262 = power_3;
            let _e265 = rough_27;
            let _e266 = f0_5;
            let _e267 = albedo_23;
            let _e268 = metallic_3;
            let _e269 = visibility_5;
            let _e270 = coat_3;
            let _e271 = coatRough_3;
            let _e272 = coatNormal_3;
            let _e273 = direct(_e253, _e254, _e255, mix(_e256, _e257, vec3(_e258)), _e261, (_e262 * 0.5f), _e265, _e266, _e267, _e268, _e269, _e270, _e271, _e272);
            radiance_2 = (_e252 + _e273);
        }
        continuing {
            let _e241 = i_9;
            i_9 = (_e241 + 1i);
        }
    }
    let _e275 = radiance_2;
    return _e275;
}

fn environment(rd_6: vec3<f32>, rough_28: f32) -> vec3<f32> {
    var rd_7: vec3<f32>;
    var rough_29: f32;
    var c_13: vec3<f32>;

    rd_7 = rd_6;
    rough_29 = rough_28;
    let _e213 = rd_7;
    c_13 = mix(vec3<f32>(0.035f, 0.043f, 0.058f), vec3<f32>(0.16f, 0.18f, 0.2f), vec3(((_e213.y * 0.5f) + 0.5f)));
    let _e222 = c_13;
    let _e227 = rd_7;
    let _e239 = rough_29;
    c_13 = (_e222 + (vec3<f32>(0.22f, 0.16f, 0.09f) * pow(max(dot(_e227, normalize(vec3<f32>(0.1f, 1f, -0.5f))), 0f), mix(90f, 4f, _e239))));
    let _e244 = c_13;
    return _e244;
}

fn quickMat(m_55: f32, p_113: vec3<f32>) -> vec3<f32> {
    var m_56: f32;
    var p_114: vec3<f32>;
    var a_10: vec3<f32> = vec3(0.6f);
    var e_2: vec3<f32> = vec3(0f);

    m_56 = m_55;
    p_114 = p_113;
    let _e212 = m_56;
    if (_e212 < 1.5f) {
        a_10 = vec3<f32>(0.61f, 0.425f, 0.245f);
    } else {
        let _e219 = m_56;
        if (_e219 < 2.5f) {
            a_10 = vec3<f32>(0.245f, 0.262f, 0.269f);
        } else {
            let _e226 = m_56;
            if (_e226 < 3.5f) {
                a_10 = vec3<f32>(0.67f, 0.45f, 0.22f);
            } else {
                let _e233 = m_56;
                if (_e233 < 4.5f) {
                    a_10 = vec3<f32>(0.35f, 0.49f, 0.26f);
                } else {
                    let _e240 = m_56;
                    if (_e240 < 5.5f) {
                        a_10 = vec3<f32>(0.74f, 0.74f, 0.7f);
                    } else {
                        let _e247 = m_56;
                        if (_e247 < 6.5f) {
                            a_10 = vec3<f32>(0.58f, 0.61f, 0.6f);
                        } else {
                            let _e254 = m_56;
                            if (_e254 < 7.5f) {
                                a_10 = vec3<f32>(0.665f, 0.029f, 0.018f);
                            } else {
                                let _e261 = m_56;
                                if (_e261 < 8.5f) {
                                    a_10 = vec3<f32>(0.255f, 0.297f, 0.326f);
                                } else {
                                    let _e268 = m_56;
                                    if (_e268 < 10.5f) {
                                        {
                                            a_10 = vec3<f32>(0.06f, 0.75f, 0.29f);
                                            e_2 = vec3<f32>(0.0175f, 0.475f, 0.125f);
                                        }
                                    } else {
                                        let _e284 = m_56;
                                        if (_e284 < 11.5f) {
                                            {
                                                a_10 = vec3<f32>(0.12f, 0.4f, 0.89f);
                                                e_2 = vec3<f32>(0.0234f, 0.14559999f, 0.52f);
                                            }
                                        } else {
                                            let _e300 = m_56;
                                            if (_e300 < 12.5f) {
                                                {
                                                    a_10 = vec3<f32>(0.88f, 0.63f, 0.12f);
                                                    let _e312 = uniforms;
                                                    e_2 = (vec3<f32>(1f, 0.53f, 0.035f) * (0.45f + (_e312.uHold.x * 0.77f)));
                                                }
                                            } else {
                                                let _e319 = m_56;
                                                if (_e319 < 13.5f) {
                                                    {
                                                        a_10 = vec3<f32>(0.95f, 0.88f, 0.73f);
                                                        e_2 = vec3<f32>(3.2f, 2.688f, 2.016f);
                                                    }
                                                } else {
                                                    let _e335 = m_56;
                                                    if (_e335 < 14.5f) {
                                                        a_10 = vec3<f32>(0.38f, 0.3f, 0.23f);
                                                    } else {
                                                        let _e342 = m_56;
                                                        if (_e342 < 15.5f) {
                                                            {
                                                                a_10 = vec3<f32>(0.025f, 0.11f, 0.065f);
                                                                e_2 = vec3<f32>(0.020000001f, 0.71999997f, 0.296f);
                                                            }
                                                        } else {
                                                            let _e358 = m_56;
                                                            if (_e358 < 16.5f) {
                                                                a_10 = vec3<f32>(0.12f, 0.41f, 0.5f);
                                                            } else {
                                                                let _e365 = m_56;
                                                                if (_e365 < 17.5f) {
                                                                    a_10 = vec3<f32>(0.42f, 0.12f, 0.51f);
                                                                } else {
                                                                    let _e372 = m_56;
                                                                    if (_e372 < 18.5f) {
                                                                        a_10 = vec3<f32>(0.73f, 0.51f, 0.25f);
                                                                    } else {
                                                                        let _e379 = m_56;
                                                                        if (_e379 < 19.5f) {
                                                                            a_10 = vec3<f32>(0.57f, 0.372f, 0.197f);
                                                                        } else {
                                                                            let _e386 = m_56;
                                                                            if (_e386 < 20.5f) {
                                                                                {
                                                                                    a_10 = vec3<f32>(0.12f, 0.77f, 0.87f);
                                                                                    e_2 = vec3<f32>(0.01025f, 0.27060002f, 0.3895f);
                                                                                }
                                                                            } else {
                                                                                a_10 = vec3<f32>(0.79f, 0.085f, 0.035f);
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    let _e406 = a_10;
    let _e412 = e_2;
    return ((pow(_e406, vec3(2.2f)) * 0.55f) + _e412);
}

fn marchEnvelope(ro_4: vec3<f32>, rd_8: vec3<f32>) -> vec2<f32> {
    var ro_5: vec3<f32>;
    var rd_9: vec3<f32>;
    var t_6: f32 = 0f;
    var i_10: i32 = 0i;
    var h_12: vec2<f32>;

    ro_5 = ro_4;
    rd_9 = rd_8;
    loop {
        let _e209 = i_10;
        if !((_e209 < 112i)) {
            break;
        }
        {
            let _e216 = ro_5;
            let _e217 = rd_9;
            let _e218 = t_6;
            let _e221 = mapScene((_e216 + (_e217 * _e218)));
            h_12 = _e221;
            let _e223 = h_12;
            if (_e223.x < 0.001f) {
                let _e227 = t_6;
                let _e228 = h_12;
                return vec2<f32>(_e227, _e228.y);
            }
            let _e231 = t_6;
            if (_e231 > 24f) {
                break;
            }
            let _e234 = t_6;
            let _e235 = h_12;
            t_6 = (_e234 + (_e235.x * 0.8f));
        }
        continuing {
            let _e213 = i_10;
            i_10 = (_e213 + 1i);
        }
    }
    let _e240 = t_6;
    return vec2<f32>(_e240, 0f);
}

fn marchFrom(ro_6: vec3<f32>, rd_10: vec3<f32>, startT: f32) -> vec2<f32> {
    var ro_7: vec3<f32>;
    var rd_11: vec3<f32>;
    var startT_1: f32;
    var t_7: f32;
    var i_11: i32 = 0i;
    var h_13: vec2<f32>;

    ro_7 = ro_6;
    rd_11 = rd_10;
    startT_1 = startT;
    let _e207 = startT_1;
    t_7 = _e207;
    loop {
        let _e211 = i_11;
        if !((_e211 < 112i)) {
            break;
        }
        {
            let _e218 = ro_7;
            let _e219 = rd_11;
            let _e220 = t_7;
            let _e223 = mapScene((_e218 + (_e219 * _e220)));
            h_13 = _e223;
            let _e225 = h_13;
            if (_e225.x < 0.001f) {
                let _e229 = t_7;
                let _e230 = h_13;
                return vec2<f32>(_e229, _e230.y);
            }
            let _e233 = t_7;
            if (_e233 > 24f) {
                break;
            }
            let _e236 = t_7;
            let _e237 = h_13;
            t_7 = (_e236 + (_e237.x * 0.8f));
        }
        continuing {
            let _e215 = i_11;
            i_11 = (_e215 + 1i);
        }
    }
    let _e242 = t_7;
    return vec2<f32>(_e242, 0f);
}

fn march(ro_8: vec3<f32>, rd_12: vec3<f32>) -> vec2<f32> {
    var ro_9: vec3<f32>;
    var rd_13: vec3<f32>;
    var base_1: vec2<f32>;
    var local_43: vec3<f32>;
    var local_44: vec3<f32>;
    var local_45: f32;

    ro_9 = ro_8;
    rd_13 = rd_12;
    gExcludedCandidates = vec3(0f);
    gHitNormalValid = false;
    gHitMaterial = 0f;
    gHitKey = 0f;
    let _e211 = ro_9;
    let _e212 = rd_13;
    let _e213 = marchEnvelope(_e211, _e212);
    base_1 = _e213;
    let _e215 = base_1;
    let _e219 = base_1;
    let _e224 = gHitNormalValid;
    if (((_e215.y > 0.5f) && (_e219.x < 24f)) && !(_e224)) {
        {
            let _e227 = ro_9;
            let _e228 = rd_13;
            let _e229 = base_1;
            gHitPoint = (_e227 + (_e228 * _e229.x));
            let _e233 = gHitPoint;
            let _e234 = normalAt(_e233);
            gHitNormal = _e234;
            gHitNormalValid = true;
            let _e236 = gExcludedCandidates;
            if (_e236.x > 0f) {
                {
                    let _e240 = base_1;
                    let _e242 = gHitPoint;
                    materialCoordinates(_e240.y, _e242, (&local_43), (&local_44), (&local_45));
                    let _e252 = local_43;
                    gHitCoordinates = _e252;
                    let _e253 = local_44;
                    gHitExtent = _e253;
                    let _e254 = local_45;
                    gHitSeed = _e254;
                    let _e255 = base_1;
                    gHitMaterial = _e255.y;
                }
            }
        }
    }
    gExcludedCandidates = vec3(0f);
    let _e260 = base_1;
    return _e260;
}

fn reflectionProbe(ro_10: vec3<f32>, rd_14: vec3<f32>, rough_30: f32) -> vec3<f32> {
    var ro_11: vec3<f32>;
    var rd_15: vec3<f32>;
    var rough_31: f32;
    var t_8: f32 = 0.025f;
    var fallback: vec3<f32>;
    var i_12: i32 = 0i;
    var p_115: vec3<f32>;
    var h_14: vec2<f32>;
    var saved: f32;
    var color_2: vec3<f32>;

    ro_11 = ro_10;
    rd_15 = rd_14;
    rough_31 = rough_30;
    let _e209 = rd_15;
    let _e210 = rough_31;
    let _e211 = environment(_e209, _e210);
    fallback = _e211;
    loop {
        let _e215 = i_12;
        if !((_e215 < 24i)) {
            break;
        }
        {
            let _e222 = ro_11;
            let _e223 = rd_15;
            let _e224 = t_8;
            p_115 = (_e222 + (_e223 * _e224));
            let _e228 = p_115;
            let _e229 = mapScene(_e228);
            h_14 = _e229;
            let _e231 = h_14;
            let _e234 = t_8;
            let _e235 = rough_31;
            if (_e231.x < (0.002f + ((_e234 * _e235) * 0.0015f))) {
                {
                    let _e241 = gFootprint;
                    saved = _e241;
                    let _e243 = saved;
                    let _e244 = rough_31;
                    let _e245 = rough_31;
                    let _e247 = t_8;
                    gFootprint = max(_e243, (((_e244 * _e245) * _e247) * 0.05f));
                    let _e252 = h_14;
                    let _e254 = p_115;
                    let _e255 = quickMat(_e252.y, _e254);
                    color_2 = _e255;
                    let _e257 = saved;
                    gFootprint = _e257;
                    let _e258 = h_14;
                    let _e262 = h_14;
                    if ((_e258.y > 12.5f) && (_e262.y < 13.5f)) {
                        let _e267 = color_2;
                        let _e268 = fallback;
                        let _e271 = rough_31;
                        color_2 = mix(_e267, _e268, vec3(smoothstep(0.16f, 0.4f, _e271)));
                    }
                    let _e275 = fallback;
                    let _e276 = color_2;
                    let _e277 = t_8;
                    let _e280 = rough_31;
                    let _e281 = rough_31;
                    let _e289 = rough_31;
                    return mix(_e275, _e276, vec3((exp((-(_e277) * (0.055f + ((_e280 * _e281) * 0.3f)))) * (1f - (_e289 * 0.4f)))));
                }
            }
            let _e296 = t_8;
            let _e297 = h_14;
            t_8 = (_e296 + clamp((_e297.x * 0.85f), 0.016f, 0.4f));
            let _e305 = t_8;
            if (_e305 > 12f) {
                break;
            }
        }
        continuing {
            let _e219 = i_12;
            i_12 = (_e219 + 1i);
        }
    }
    let _e308 = fallback;
    return _e308;
}

fn roughReflection(p_116: vec3<f32>, geometric_4: vec3<f32>, rd_16: vec3<f32>, n_49: vec3<f32>, rough_32: f32) -> vec3<f32> {
    var p_117: vec3<f32>;
    var geometric_5: vec3<f32>;
    var rd_17: vec3<f32>;
    var n_50: vec3<f32>;
    var rough_33: f32;
    var r_13: vec3<f32>;
    var sum: vec3<f32> = vec3(0f);
    var local_46: vec3<f32>;
    var tangent: vec3<f32>;
    var i_13: i32 = 0i;
    var local_47: f32;
    var offset_4: f32;
    var direction_1: vec3<f32>;

    p_117 = p_116;
    geometric_5 = geometric_4;
    rd_17 = rd_16;
    n_50 = n_49;
    rough_33 = rough_32;
    let _e211 = rd_17;
    let _e212 = n_50;
    r_13 = reflect(_e211, _e212);
    let _e219 = r_13;
    let _e220 = r_13;
    if (abs(_e220.y) < 0.95f) {
        local_46 = vec3<f32>(0f, 1f, 0f);
    } else {
        local_46 = vec3<f32>(1f, 0f, 0f);
    }
    let _e240 = local_46;
    tangent = normalize(cross(_e219, _e240));
    loop {
        let _e246 = i_13;
        if !((_e246 < 1i)) {
            break;
        }
        {
            if true {
                local_47 = 0f;
            } else {
                let _e257 = i_13;
                local_47 = ((f32(_e257) * 2f) - 1f);
            }
            let _e264 = local_47;
            offset_4 = _e264;
            let _e266 = r_13;
            let _e267 = tangent;
            let _e268 = offset_4;
            let _e270 = rough_33;
            let _e272 = rough_33;
            direction_1 = normalize((_e266 + ((((_e267 * _e268) * _e270) * _e272) * 0.065f)));
            let _e279 = direction_1;
            let _e280 = geometric_5;
            let _e282 = direction_1;
            let _e283 = geometric_5;
            direction_1 = normalize((_e279 + (_e280 * max((0.025f - dot(_e282, _e283)), 0f))));
            let _e291 = sum;
            let _e292 = p_117;
            let _e293 = geometric_5;
            let _e297 = direction_1;
            let _e298 = rough_33;
            let _e299 = reflectionProbe((_e292 + (_e293 * 0.014f)), _e297, _e298);
            sum = (_e291 + _e299);
        }
        continuing {
            let _e250 = i_13;
            i_13 = (_e250 + 1i);
        }
    }
    let _e301 = sum;
    return (_e301 / vec3(1f));
}

fn shortBounce(p_118: vec3<f32>, n_51: vec3<f32>) -> vec3<f32> {
    var p_119: vec3<f32>;
    var n_52: vec3<f32>;
    var result: vec3<f32> = vec3(0f);

    p_119 = p_118;
    n_52 = n_51;
    let _e209 = result;
    return _e209;
}

fn lightSpill(p_120: vec3<f32>, n_53: vec3<f32>, source: vec3<f32>, color_3: vec3<f32>, power_4: f32) -> vec3<f32> {
    var p_121: vec3<f32>;
    var n_54: vec3<f32>;
    var source_1: vec3<f32>;
    var color_4: vec3<f32>;
    var power_5: f32;
    var d_17: vec3<f32>;
    var d2_1: f32;

    p_121 = p_120;
    n_54 = n_53;
    source_1 = source;
    color_4 = color_3;
    power_5 = power_4;
    let _e211 = source_1;
    let _e212 = p_121;
    d_17 = (_e211 - _e212);
    let _e215 = d_17;
    let _e216 = d_17;
    d2_1 = dot(_e215, _e216);
    let _e219 = color_4;
    let _e220 = power_5;
    let _e222 = n_54;
    let _e223 = d_17;
    let _e234 = d2_1;
    return (((_e219 * _e220) * max(dot(_e222, normalize((_e223 + vec3(0.0001f)))), 0f)) / vec3((1f + (9f * _e234))));
}

fn zoneSpill(p_122: vec3<f32>, n_55: vec3<f32>, z_4: vec4<f32>) -> vec3<f32> {
    var p_123: vec3<f32>;
    var n_56: vec3<f32>;
    var z_5: vec4<f32>;
    var local_48: vec3<f32>;
    var local_49: vec3<f32>;
    var local_50: vec3<f32>;
    var color_5: vec3<f32>;

    p_123 = p_122;
    n_56 = n_55;
    z_5 = z_4;
    let _e207 = z_5;
    if (_e207.w < 0.5f) {
        return vec3(0f);
    }
    let _e214 = z_5;
    if (_e214.w < 1.5f) {
        local_50 = vec3<f32>(0.015f, 0.05f, 0.065f);
    } else {
        let _e222 = z_5;
        if (_e222.w < 2.5f) {
            local_49 = vec3<f32>(0.04f, 0.01f, 0.05f);
        } else {
            let _e230 = z_5;
            if (_e230.w < 3.5f) {
                local_48 = vec3<f32>(0.045f, 0.026f, 0.01f);
            } else {
                local_48 = vec3<f32>(0.025f, 0.58f, 0.8f);
            }
            let _e243 = local_48;
            local_49 = _e243;
        }
        let _e245 = local_49;
        local_50 = _e245;
    }
    let _e247 = local_50;
    color_5 = _e247;
    let _e249 = p_123;
    let _e250 = n_56;
    let _e251 = z_5;
    let _e254 = z_5;
    let _e257 = color_5;
    let _e259 = lightSpill(_e249, _e250, vec3<f32>(_e251.x, 0.12f, _e254.y), _e257, 0.25f);
    return _e259;
}

fn shade(p_124: vec3<f32>, geometric_6: vec3<f32>, m_57: f32, rd_18: vec3<f32>) -> vec3<f32> {
    var p_125: vec3<f32>;
    var geometric_7: vec3<f32>;
    var m_58: f32;
    var rd_19: vec3<f32>;
    var lp_2: vec3<f32> = vec3<f32>(0f, 3.045f, -1.65f);
    var ld: vec3<f32>;
    var rim_3: vec3<f32> = vec3<f32>(1.95f, 3.04f, -0.4f);
    var rl: vec3<f32>;
    var n_57: vec3<f32>;
    var albedo_24: vec3<f32>;
    var emit_20: vec3<f32>;
    var rough_34: f32;
    var spec_20: f32;
    var layers_20: vec4<f32>;
    var v_7: vec3<f32>;
    var metallic_4: f32;
    var amb: f32;
    var nv_1: f32;
    var f0_6: vec3<f32>;
    var f_6: vec3<f32>;
    var coat_4: f32;
    var coatRough_4: f32;
    var key_4: vec3<f32>;
    var visibility_6: f32;
    var col: vec3<f32>;
    var rimShadow: f32 = 1f;
    var wrap: f32;
    var thin: f32;
    var cf_1: f32;
    var response: vec3<f32>;
    var spill: vec3<f32>;
    var d_18: vec2<f32>;
    var contact_1: f32;
    var local_51: f32;
    var frame_1: f32;
    var radius_5: f32;
    var wave_2: f32;
    var halo: f32;
    var pulse_1: f32;
    var ring_1: f32;
    var glow: f32;

    p_125 = p_124;
    geometric_7 = geometric_6;
    m_58 = m_57;
    rd_19 = rd_18;
    let _e216 = lp_2;
    let _e217 = p_125;
    ld = (_e216 - _e217);
    let _e226 = rim_3;
    let _e227 = p_125;
    rl = (_e226 - _e227);
    let _e236 = m_58;
    let _e237 = p_125;
    let _e238 = geometric_7;
    surfaceMaterial(_e236, _e237, _e238, (&albedo_24), (&rough_34), (&spec_20), (&emit_20), (&layers_20), (&n_57));
    let _e251 = rd_19;
    v_7 = -(_e251);
    let _e254 = layers_20;
    metallic_4 = _e254.x;
    let _e257 = p_125;
    let _e258 = geometric_7;
    let _e259 = ao(_e257, _e258);
    amb = _e259;
    let _e261 = n_57;
    let _e262 = v_7;
    nv_1 = max(dot(_e261, _e262), 0f);
    let _e268 = spec_20;
    let _e276 = albedo_24;
    let _e277 = metallic_4;
    f0_6 = mix(vec3(clamp((0.024f + (_e268 * 0.075f)), 0.025f, 0.065f)), _e276, vec3(_e277));
    let _e281 = f0_6;
    let _e282 = nv_1;
    let _e283 = fresnelSchlick(_e281, _e282);
    f_6 = _e283;
    let _e285 = layers_20;
    coat_4 = _e285.y;
    let _e288 = layers_20;
    coatRough_4 = _e288.z;
    let _e295 = uniforms;
    let _e299 = uniforms;
    key_4 = (vec3<f32>(1f, 0.86f, 0.68f) + vec3<f32>(_e295.uLook.y, 0f, -(_e299.uLook.y)));
    let _e306 = p_125;
    let _e307 = geometric_7;
    let _e311 = ld;
    let _e314 = ld;
    let _e318 = softShadow((_e306 + (_e307 * 0.009f)), normalize(_e311), 0.014f, (length(_e314) - 0.04f));
    visibility_6 = _e318;
    let _e320 = visibility_6;
    let _e321 = m_58;
    let _e322 = p_125;
    let _e323 = geometric_7;
    let _e324 = ld;
    let _e326 = reliefVisibility(_e321, _e322, _e323, normalize(_e324));
    visibility_6 = (_e320 * _e326);
    let _e328 = albedo_24;
    let _e330 = metallic_4;
    let _e334 = f_6;
    let _e338 = p_125;
    let _e339 = geometric_7;
    let _e340 = roomBounce(_e338, _e339);
    let _e342 = amb;
    col = ((((_e328 * (1f - _e330)) * (vec3(1f) - _e334)) * _e340) * _e342);
    let _e345 = col;
    let _e346 = p_125;
    let _e347 = n_57;
    let _e348 = v_7;
    let _e349 = lp_2;
    let _e350 = key_4;
    let _e352 = rough_34;
    let _e353 = f0_6;
    let _e354 = albedo_24;
    let _e355 = metallic_4;
    let _e356 = visibility_6;
    let _e357 = coat_4;
    let _e358 = coatRough_4;
    let _e359 = geometric_7;
    let _e360 = direct(_e346, _e347, _e348, _e349, _e350, 5.7f, _e352, _e353, _e354, _e355, _e356, _e357, _e358, _e359);
    col = (_e345 + _e360);
    let _e362 = col;
    let _e363 = p_125;
    let _e364 = n_57;
    let _e365 = v_7;
    let _e382 = rough_34;
    let _e383 = f0_6;
    let _e384 = albedo_24;
    let _e385 = metallic_4;
    let _e387 = coat_4;
    let _e388 = coatRough_4;
    let _e389 = geometric_7;
    let _e390 = stripLighting(_e363, _e364, _e365, vec3<f32>(-1.95f, 3.04f, -1.65f), vec3<f32>(-1.95f, 3.04f, 0.9f), vec3<f32>(0.92f, 0.94f, 1f), 2.6f, _e382, _e383, _e384, _e385, 0.85f, _e387, _e388, _e389);
    col = (_e362 + _e390);
    let _e394 = rimShadow;
    let _e395 = m_58;
    let _e396 = p_125;
    let _e397 = geometric_7;
    let _e398 = rl;
    let _e400 = reliefVisibility(_e395, _e396, _e397, normalize(_e398));
    rimShadow = (_e394 * _e400);
    let _e402 = col;
    let _e403 = p_125;
    let _e404 = n_57;
    let _e405 = v_7;
    let _e406 = rim_3;
    let _e412 = rough_34;
    let _e413 = f0_6;
    let _e414 = albedo_24;
    let _e415 = metallic_4;
    let _e416 = rimShadow;
    let _e417 = coat_4;
    let _e418 = coatRough_4;
    let _e419 = geometric_7;
    let _e420 = direct(_e403, _e404, _e405, _e406, vec3<f32>(1f, 0.86f, 0.69f), 1.7f, _e412, _e413, _e414, _e415, _e416, _e417, _e418, _e419);
    col = (_e402 + _e420);
    let _e422 = col;
    let _e423 = albedo_24;
    let _e424 = layers_20;
    let _e428 = nv_1;
    let _e433 = p_125;
    let _e434 = geometric_7;
    let _e435 = roomBounce(_e433, _e434);
    let _e437 = amb;
    col = (_e422 + ((((_e423 * _e424.w) * pow((1f - _e428), 4f)) * _e435) * _e437));
    let _e440 = col;
    let _e443 = amb;
    col = (_e440 * (0.88f + (0.12f * _e443)));
    let _e447 = m_58;
    let _e450 = m_58;
    if ((_e447 > 16.5f) && (_e450 < 17.5f)) {
        let _e454 = col;
        let _e460 = nv_1;
        let _e467 = amb;
        col = (_e454 + ((vec3<f32>(0.19f, 0.009f, 0.29f) * pow((1f - _e460), 2f)) * (0.55f + (0.45f * _e467))));
    }
    let _e472 = m_58;
    if (_e472 > 21.5f) {
        {
            let _e475 = n_57;
            let _e477 = ld;
            wrap = pow(clamp(((dot(-(_e475), normalize(_e477)) + 0.45f) / 1.45f), 0f, 1f), 2f);
            let _e493 = nv_1;
            thin = (0.18f + (0.82f * pow((1f - _e493), 2f)));
            let _e500 = col;
            let _e505 = wrap;
            let _e507 = thin;
            let _e511 = amb;
            col = (_e500 + (((vec3<f32>(0.58f, 0.055f, 0.018f) * _e505) * _e507) * (0.5f + (0.5f * _e511))));
        }
    }
    let _e516 = rough_34;
    let _e519 = m_58;
    let _e522 = m_58;
    let _e525 = m_58;
    let _e530 = m_58;
    let _e533 = m_58;
    let _e538 = m_58;
    let _e541 = m_58;
    let _e546 = m_58;
    if ((_e516 < 0.78f) && (((((_e519 < 1.5f) || ((_e522 > 6.5f) && (_e525 < 8.5f))) || ((_e530 > 13.5f) && (_e533 < 17.5f))) || ((_e538 > 18.5f) && (_e541 < 19.5f))) || (_e546 > 21.5f))) {
        {
            let _e554 = geometric_7;
            let _e555 = v_7;
            cf_1 = (0.04f + (0.96f * pow((1f - max(dot(_e554, _e555), 0f)), 5f)));
            let _e565 = f_6;
            let _e567 = coat_4;
            let _e568 = cf_1;
            let _e573 = coat_4;
            let _e574 = cf_1;
            let _e578 = coat_4;
            let _e579 = cf_1;
            response = (((_e565 * (1f - (_e567 * _e568))) * (1f - (_e573 * _e574))) + vec3((_e578 * _e579)));
            let _e584 = col;
            let _e585 = p_125;
            let _e586 = geometric_7;
            let _e587 = rd_19;
            let _e588 = n_57;
            let _e589 = rough_34;
            let _e590 = coatRough_4;
            let _e591 = coat_4;
            let _e595 = roughReflection(_e585, _e586, _e587, _e588, mix(_e589, _e590, (_e591 * 0.35f)));
            let _e596 = response;
            let _e599 = rough_34;
            let _e606 = amb;
            col = (_e584 + (((_e595 * _e596) * (1f - (_e599 * 0.55f))) * (0.6f + (0.4f * _e606))));
        }
    }
    let _e611 = p_125;
    let _e612 = geometric_7;
    let _e613 = uniforms;
    let _e618 = uniforms;
    let _e622 = uniforms;
    let _e627 = targetColor();
    let _e629 = uniforms;
    let _e635 = lightSpill(_e611, _e612, vec3<f32>(_e613.uTarget.x, (0.16f + _e618.uTargetY.x), _e622.uTarget.y), _e627, (0.9f + (_e629.uTransition.z * 1.8f)));
    spill = _e635;
    let _e637 = uniforms;
    if (_e637.uTargetType.x > 3.5f) {
        let _e642 = spill;
        let _e643 = p_125;
        let _e644 = geometric_7;
        let _e645 = uniforms;
        let _e650 = uniforms;
        let _e657 = targetColor();
        let _e659 = uniforms;
        let _e665 = lightSpill(_e643, _e644, vec3<f32>(_e645.uTarget.x, (0.75f + _e650.uTargetY.x), -3.08f), _e657, (1.3f + (_e659.uTransition.z * 2f)));
        spill = (_e642 + _e665);
    }
    let _e667 = spill;
    let _e668 = p_125;
    let _e669 = geometric_7;
    let _e670 = uniforms;
    let _e672 = zoneSpill(_e668, _e669, _e670.uZone0_);
    spill = (_e667 + _e672);
    let _e674 = spill;
    let _e675 = p_125;
    let _e676 = geometric_7;
    let _e677 = uniforms;
    let _e679 = zoneSpill(_e675, _e676, _e677.uZone1_);
    spill = (_e674 + _e679);
    let _e681 = spill;
    let _e682 = p_125;
    let _e683 = geometric_7;
    let _e684 = uniforms;
    let _e686 = zoneSpill(_e682, _e683, _e684.uZone2_);
    spill = (_e681 + _e686);
    let _e688 = spill;
    let _e689 = p_125;
    let _e690 = geometric_7;
    let _e691 = uniforms;
    let _e693 = zoneSpill(_e689, _e690, _e691.uZone3_);
    spill = (_e688 + _e693);
    let _e695 = spill;
    let _e696 = p_125;
    let _e697 = geometric_7;
    let _e698 = uniforms;
    let _e700 = zoneSpill(_e696, _e697, _e698.uZone4_);
    spill = (_e695 + _e700);
    let _e702 = spill;
    let _e703 = p_125;
    let _e704 = geometric_7;
    let _e705 = uniforms;
    let _e707 = zoneSpill(_e703, _e704, _e705.uZone5_);
    spill = (_e702 + _e707);
    let _e709 = spill;
    let _e710 = p_125;
    let _e711 = geometric_7;
    let _e712 = uniforms;
    let _e714 = zoneSpill(_e710, _e711, _e712.uZone6_);
    spill = (_e709 + _e714);
    let _e716 = spill;
    let _e717 = p_125;
    let _e718 = geometric_7;
    let _e719 = uniforms;
    let _e721 = zoneSpill(_e717, _e718, _e719.uZone7_);
    spill = (_e716 + _e721);
    let _e723 = col;
    let _e724 = albedo_24;
    let _e725 = spill;
    let _e727 = amb;
    col = (_e723 + ((_e724 * _e725) * _e727));
    let _e730 = m_58;
    let _e733 = m_58;
    let _e736 = m_58;
    let _e741 = geometric_7;
    if (((_e730 < 2.5f) || ((_e733 > 18.5f) && (_e736 < 19.5f))) && (_e741.y > 0.5f)) {
        {
            let _e746 = p_125;
            let _e748 = uniforms;
            let _e755 = cubeScale();
            d_18 = ((_e746.xz - _e748.uCube.xy) / (vec2<f32>(0.34f, 0.32f) * _e755));
            let _e759 = d_18;
            let _e760 = d_18;
            let _e767 = uniforms;
            let _e770 = p_125;
            contact_1 = (exp((-(dot(_e759, _e760)) * 1.6f)) * exp((-(max(0f, (_e767.uCubeFoot.x - _e770.y))) * 7f)));
            let _e780 = col;
            let _e783 = contact_1;
            let _e786 = cubeScale();
            col = (_e780 * (1f - ((0.22f * _e783) * min(1f, _e786))));
        }
    }
    let _e791 = m_58;
    let _e794 = m_58;
    if ((_e791 > 14.5f) && (_e794 < 15.5f)) {
        {
            let _e798 = p_125;
            if (_e798.z < -3.09f) {
                let _e805 = p_125;
                let _e807 = uniforms;
                let _e815 = p_125;
                let _e819 = uniforms;
                local_51 = smoothstep(0.83f, 0.94f, max((abs((_e805.x - _e807.uTarget.x)) / 0.58f), (abs(((_e815.y - 0.74f) - _e819.uTargetY.x)) / 0.7f)));
            } else {
                local_51 = 0f;
            }
            let _e830 = local_51;
            frame_1 = _e830;
            let _e832 = p_125;
            let _e833 = rd_19;
            let _e834 = portalEnergy(_e832, _e833);
            let _e837 = frame_1;
            let _e841 = uniforms;
            emit_20 = ((_e834 * mix(1f, 0.32f, _e837)) * (1f + (_e841.uTransition.z * 1.8f)));
        }
    }
    let _e848 = uniforms;
    if (_e848.uTransition.z > 0.001f) {
        {
            let _e853 = p_125;
            let _e855 = uniforms;
            radius_5 = length((_e853.xz - _e855.uTarget.xy));
            let _e861 = radius_5;
            let _e863 = uniforms;
            wave_2 = abs((_e861 - (0.4f + (_e863.uTransition.w * 0.25f))));
            let _e872 = wave_2;
            let _e874 = aaLine(_e872, 0.045f);
            let _e875 = radius_5;
            let _e877 = uniforms;
            let _e886 = aaLine(abs((_e875 - (0.54f + (_e877.uTransition.w * 0.12f)))), 0.016f);
            halo = (_e874 + (_e886 * 0.55f));
            let _e891 = halo;
            let _e892 = p_125;
            let _e894 = uniforms;
            let _e903 = geometric_7;
            halo = (_e891 * (exp((-(abs((_e892.y - _e894.uTargetY.x))) * 18f)) * max(_e903.y, 0f)));
            let _e909 = col;
            let _e910 = targetColor();
            let _e911 = halo;
            let _e913 = uniforms;
            col = (_e909 + (((_e910 * _e911) * _e913.uTransition.z) * 2f));
            let _e920 = m_58;
            let _e923 = m_58;
            let _e927 = m_58;
            let _e930 = m_58;
            if (((_e920 > 9.5f) && (_e923 < 12.5f)) || ((_e927 > 14.5f) && (_e930 < 15.5f))) {
                let _e935 = emit_20;
                let _e936 = targetColor();
                let _e937 = uniforms;
                let _e943 = radius_5;
                let _e946 = uniforms;
                emit_20 = (_e935 + ((_e936 * _e937.uTransition.z) * (0.65f + (0.35f * sin(((_e943 * 22f) - (_e946.uTransition.w * 5f)))))));
            }
            let _e957 = m_58;
            let _e960 = m_58;
            if ((_e957 > 6.5f) && (_e960 < 7.5f)) {
                let _e964 = emit_20;
                let _e969 = targetColor();
                let _e973 = uniforms;
                let _e979 = p_125;
                let _e980 = cubeLocal(_e979);
                let _e981 = cubeEdge(_e980);
                emit_20 = (_e964 + ((mix(vec3<f32>(1f, 0.18f, 0.04f), _e969, vec3(0.3f)) * _e973.uTransition.z) * (0.09f + (0.65f * _e981))));
            }
        }
    }
    let _e986 = uniforms;
    let _e989 = uniforms;
    pulse_1 = (_e986.uPulse.z * _e989.uLook.w);
    let _e994 = pulse_1;
    if (_e994 > 0.001f) {
        {
            let _e997 = p_125;
            let _e999 = uniforms;
            let _e1007 = pulse_1;
            ring_1 = abs((length((_e997.xz - _e999.uPulse.xy)) - mix(0.14f, 2.08f, (1f - _e1007))));
            let _e1013 = p_125;
            let _e1015 = uniforms;
            let _e1024 = ring_1;
            let _e1026 = aaLine(_e1024, 0.03f);
            let _e1028 = pulse_1;
            glow = ((exp((-(abs((_e1013.y - _e1015.uTargetY.x))) * 25f)) * _e1026) * _e1028);
            let _e1031 = col;
            let _e1032 = targetColor();
            let _e1033 = glow;
            col = (_e1031 + ((_e1032 * _e1033) * 0.75f));
        }
    }
    let _e1038 = col;
    let _e1039 = emit_20;
    return max((_e1038 + _e1039), vec3(0f));
}

fn segDist(p_126: vec3<f32>, a_11: vec3<f32>, b_12: vec3<f32>) -> f32 {
    var p_127: vec3<f32>;
    var a_12: vec3<f32>;
    var b_13: vec3<f32>;
    var pa: vec3<f32>;
    var ba: vec3<f32>;

    p_127 = p_126;
    a_12 = a_11;
    b_13 = b_12;
    let _e207 = p_127;
    let _e208 = a_12;
    pa = (_e207 - _e208);
    let _e211 = b_13;
    let _e212 = a_12;
    ba = (_e211 - _e212);
    let _e215 = pa;
    let _e216 = ba;
    let _e217 = pa;
    let _e218 = ba;
    let _e220 = ba;
    let _e221 = ba;
    return length((_e215 - (_e216 * clamp((dot(_e217, _e218) / dot(_e220, _e221)), 0f, 1f))));
}

fn safeRcp(x_5: f32) -> f32 {
    var x_6: f32;
    var local_52: f32;
    var local_53: f32;

    x_6 = x_5;
    let _e204 = x_6;
    if (abs(_e204) < 0.0001f) {
        let _e208 = x_6;
        if (_e208 < 0f) {
            local_52 = -0.0001f;
        } else {
            local_52 = 0.0001f;
        }
        let _e215 = local_52;
        local_53 = _e215;
    } else {
        let _e216 = x_6;
        local_53 = _e216;
    }
    let _e218 = local_53;
    return (1f / _e218);
}

fn airInterval(ro_12: vec3<f32>, rd_20: vec3<f32>, hitDistance: f32) -> vec2<f32> {
    var ro_13: vec3<f32>;
    var rd_21: vec3<f32>;
    var hitDistance_1: f32;
    var inv: vec3<f32>;
    var a_13: vec3<f32>;
    var b_14: vec3<f32>;
    var lo: vec3<f32>;
    var hi: vec3<f32>;
    var begin: f32;
    var end_2: f32;

    ro_13 = ro_12;
    rd_21 = rd_20;
    hitDistance_1 = hitDistance;
    let _e207 = rd_21;
    let _e209 = safeRcp(_e207.x);
    let _e210 = rd_21;
    let _e212 = safeRcp(_e210.y);
    let _e213 = rd_21;
    let _e215 = safeRcp(_e213.z);
    inv = vec3<f32>(_e209, _e212, _e215);
    let _e224 = ro_13;
    let _e226 = inv;
    a_13 = ((vec3<f32>(-3.18f, 0.02f, -3.18f) - _e224) * _e226);
    let _e233 = ro_13;
    let _e235 = inv;
    b_14 = ((vec3<f32>(3.18f, 3.13f, 3.2f) - _e233) * _e235);
    let _e238 = a_13;
    let _e239 = b_14;
    lo = min(_e238, _e239);
    let _e242 = a_13;
    let _e243 = b_14;
    hi = max(_e242, _e243);
    let _e247 = lo;
    let _e249 = lo;
    let _e251 = lo;
    begin = max(0f, max(_e247.x, max(_e249.y, _e251.z)));
    let _e257 = hitDistance_1;
    let _e258 = hi;
    let _e260 = hi;
    let _e262 = hi;
    end_2 = min(_e257, min(_e258.x, min(_e260.y, _e262.z)));
    let _e268 = begin;
    let _e269 = begin;
    let _e270 = end_2;
    return vec2<f32>(_e268, max(_e269, _e270));
}

fn atmosphere(color_6: vec3<f32>, ro_14: vec3<f32>, rd_22: vec3<f32>, hitDistance_2: f32) -> vec3<f32> {
    var color_7: vec3<f32>;
    var ro_15: vec3<f32>;
    var rd_23: vec3<f32>;
    var hitDistance_3: f32;
    var interval: vec2<f32>;
    var ds: f32;
    var scatter: vec3<f32> = vec3(0f);
    var transmission_2: f32 = 1f;
    var i_14: i32 = 0i;
    var t_9: f32;
    var p_128: vec3<f32>;
    var dust: f32;
    var density_1: f32;
    var extinction_1: f32;
    var strip: f32;
    var toLight: vec3<f32>;
    var cosine_4: f32;
    var g: f32;
    var phase_6: f32;
    var source_2: vec3<f32>;
    var delta_2: vec3<f32>;

    color_7 = color_6;
    ro_15 = ro_14;
    rd_23 = rd_22;
    hitDistance_3 = hitDistance_2;
    let _e209 = ro_15;
    let _e210 = rd_23;
    let _e211 = hitDistance_3;
    let _e212 = airInterval(_e209, _e210, _e211);
    interval = _e212;
    let _e214 = interval;
    let _e216 = interval;
    ds = ((_e214.y - _e216.x) / 5f);
    loop {
        let _e231 = i_14;
        if !((_e231 < 5i)) {
            break;
        }
        {
            let _e238 = interval;
            let _e240 = i_14;
            let _e244 = ds;
            t_9 = (_e238.x + ((f32(_e240) + 0.5f) * _e244));
            let _e248 = ro_15;
            let _e249 = rd_23;
            let _e250 = t_9;
            p_128 = (_e248 + (_e249 * _e250));
            let _e256 = p_128;
            let _e260 = effectTime();
            let _e263 = p_128;
            let _e269 = noise(((_e256.xz * 1.3f) + vec2<f32>((_e260 * 0.014f), (_e263.y * 0.65f))));
            dust = (0.82f + (0.18f * _e269));
            let _e274 = uniforms;
            let _e280 = p_128;
            let _e291 = dust;
            density_1 = (((0.012f * _e274.uLook.z) * (0.45f + (0.55f * exp((-(max(_e280.y, 0f)) * 0.6f))))) * _e291);
            let _e294 = density_1;
            let _e296 = ds;
            extinction_1 = exp((-(_e294) * _e296));
            let _e300 = p_128;
            let _e312 = segDist(_e300, vec3<f32>(-1.95f, 3.09f, -1.65f), vec3<f32>(1.95f, 3.09f, -1.65f));
            strip = exp((-(_e312) * 1.4f));
            let _e318 = strip;
            let _e319 = p_128;
            let _e331 = segDist(_e319, vec3<f32>(-1.95f, 3.09f, -1.7f), vec3<f32>(-1.95f, 3.09f, 1.05f));
            strip = (_e318 + (exp((-(_e331) * 1.6f)) * 0.45f));
            let _e339 = strip;
            let _e340 = p_128;
            let _e350 = segDist(_e340, vec3<f32>(1.95f, 3.09f, -1.7f), vec3<f32>(1.95f, 3.09f, 1.05f));
            strip = (_e339 + (exp((-(_e350) * 1.6f)) * 0.45f));
            let _e364 = p_128;
            toLight = normalize((vec3<f32>(0f, 3.09f, -1.65f) - _e364));
            let _e368 = rd_23;
            let _e370 = toLight;
            cosine_4 = dot(-(_e368), _e370);
            g = 0.32f;
            let _e376 = g;
            let _e377 = g;
            let _e381 = g;
            let _e382 = g;
            let _e386 = g;
            let _e388 = cosine_4;
            phase_6 = ((1f - (_e376 * _e377)) / pow(max(((1f + (_e381 * _e382)) - ((2f * _e386) * _e388)), 0.1f), 1.5f));
            let _e405 = strip;
            let _e407 = phase_6;
            source_2 = (vec3<f32>(0.1f, 0.13f, 0.17f) + (((vec3<f32>(1f, 0.82f, 0.59f) * _e405) * _e407) * 0.8f));
            let _e413 = uniforms;
            if (_e413.uTargetType.x > 3.5f) {
                {
                    let _e418 = p_128;
                    let _e419 = uniforms;
                    let _e424 = uniforms;
                    delta_2 = (_e418 - vec3<f32>(_e419.uTarget.x, (0.75f + _e424.uTargetY.x), -3.08f));
                    let _e433 = source_2;
                    let _e438 = delta_2;
                    let _e439 = delta_2;
                    source_2 = (_e433 + (vec3<f32>(0.015f, 0.6f, 0.22f) * exp((-(dot(_e438, _e439)) * 3f))));
                }
            }
            let _e447 = scatter;
            let _e448 = transmission_2;
            let _e450 = extinction_1;
            let _e453 = source_2;
            scatter = (_e447 + ((_e448 * (1f - _e450)) * _e453));
            let _e456 = transmission_2;
            let _e457 = extinction_1;
            transmission_2 = (_e456 * _e457);
        }
        continuing {
            let _e235 = i_14;
            i_14 = (_e235 + 1i);
        }
    }
    let _e459 = color_7;
    let _e460 = transmission_2;
    let _e462 = scatter;
    return ((_e459 * _e460) + _e462);
}

fn cameraRay(frag: vec2<f32>, ro_16: ptr<function, vec3<f32>>) -> vec3<f32> {
    var frag_1: vec2<f32>;
    var jitter: vec2<f32>;
    var uv_17: vec2<f32>;
    var lens: f32;
    var land: f32;
    var fov: f32;
    var ta: vec3<f32>;
    var ww: vec3<f32>;
    var uu: vec3<f32>;
    var vv: vec3<f32>;

    frag_1 = frag;
    let _e204 = uniforms;
    let _e209 = hash(vec2<f32>(_e204.uTime.x, 1.3f));
    let _e211 = uniforms;
    let _e215 = hash(vec2<f32>(2.7f, _e211.uTime.x));
    jitter = (vec2<f32>(_e209, _e215) - vec2(0.5f));
    let _e221 = frag_1;
    let _e224 = uniforms;
    let _e229 = uniforms;
    let _e235 = jitter;
    let _e236 = uniforms;
    uv_17 = ((((_e221 * 2f) - _e224.uRes.xy) / vec2(_e229.uRes.y)) + ((_e235 * _e236.uShake.x) * 0.018f));
    let _e244 = uv_17;
    let _e245 = uv_17;
    lens = dot(_e244, _e245);
    let _e248 = uv_17;
    let _e251 = lens;
    uv_17 = (_e248 * (1f + (0.035f * _e251)));
    let _e255 = uniforms;
    let _e259 = uniforms;
    land = step(_e255.uRes.y, _e259.uRes.x);
    let _e267 = land;
    fov = mix(1.02f, 1.34f, _e267);
    let _e270 = uniforms;
    let _e276 = uniforms;
    let _e282 = uniforms;
    let _e288 = uniforms;
    let _e293 = uniforms;
    let _e298 = uniforms;
    let _e308 = land;
    let _e310 = uniforms;
    (*ro_16) = vec3<f32>(((_e270.uGravity.x * 0.5f) + ((_e276.uCube.x * 0.055f) * _e282.uMotion.x)), ((1.42f + ((_e288.uCubeY.x * 0.06f) * _e293.uMotion.x)) + (abs(_e298.uGravity.y) * 0.1f)), (mix(5.78f, 5.08f, _e308) + (_e310.uGravity.y * 0.3f)));
    let _e318 = uniforms;
    let _e324 = uniforms;
    let _e329 = uniforms;
    let _e334 = uniforms;
    let _e341 = uniforms;
    let _e347 = uniforms;
    ta = vec3<f32>(((_e318.uCube.x * 0.05f) * _e324.uMotion.x), (0.82f + ((_e329.uCubeY.x * 0.18f) * _e334.uMotion.x)), (-0.56f + ((_e341.uCube.y * 0.04f) * _e347.uMotion.x)));
    let _e354 = ta;
    let _e355 = (*ro_16);
    ww = normalize((_e354 - _e355));
    let _e359 = ww;
    uu = normalize(cross(_e359, vec3<f32>(0f, 1f, 0f)));
    let _e370 = uu;
    let _e371 = ww;
    vv = cross(_e370, _e371);
    let _e374 = uu;
    let _e375 = uv_17;
    let _e378 = vv;
    let _e379 = uv_17;
    let _e383 = ww;
    let _e384 = fov;
    return normalize((((_e374 * _e375.x) + (_e378 * _e379.y)) + (_e383 * _e384)));
}

fn aces(x_7: vec3<f32>) -> vec3<f32> {
    var x_8: vec3<f32>;
    var a_14: f32 = 2.51f;
    var b_15: f32 = 0.03f;
    var c_14: f32 = 2.43f;
    var d_19: f32 = 0.59f;
    var e_3: f32 = 0.14f;

    x_8 = x_7;
    let _e213 = x_8;
    let _e214 = a_14;
    let _e215 = x_8;
    let _e217 = b_15;
    let _e221 = x_8;
    let _e222 = c_14;
    let _e223 = x_8;
    let _e225 = d_19;
    let _e229 = e_3;
    return clamp(((_e213 * ((_e214 * _e215) + vec3(_e217))) / ((_e221 * ((_e222 * _e223) + vec3(_e225))) + vec3(_e229))), vec3(0f), vec3(1f));
}

fn packSurfaceWord(word: f32) -> vec2<f32> {
    var word_1: f32;

    word_1 = word;
    let _e203 = word_1;
    let _e207 = word_1;
    return (vec2<f32>(floor((_e203 / 256f)), (_e207 - (floor((_e207 / 256f)) * 256f))) / vec2(255f));
}

fn unpackSurfaceWord(bytes: vec2<f32>) -> f32 {
    var bytes_1: vec2<f32>;

    bytes_1 = bytes;
    let _e203 = bytes_1;
    return dot(floor(((_e203 * 255f) + vec2(0.5f))), vec2<f32>(256f, 1f));
}

fn main_1() {
    var ro_17: vec3<f32>;
    var rd_24: vec3<f32>;
    var rayCone: f32;
    var hit_2: vec2<f32>;
    var col_1: vec3<f32> = vec3<f32>(0.018f, 0.024f, 0.032f);
    var p_129: vec3<f32>;
    var geometric_8: vec3<f32>;
    var q_17: vec2<f32>;
    var lum: f32;

    let _e203 = gl_FragCoord_1;
    let _e205 = uniforms;
    let _e208 = gl_FragCoord_1;
    let _e212 = uniforms;
    let _e218 = cameraRay((vec2<f32>(_e203.x, (_e205.uRes.y - _e208.y)) + _e212.uSample.xy), (&ro_17));
    rd_24 = _e218;
    let _e221 = uniforms;
    rayCone = (1.4f / max(_e221.uRes.y, 2f));
    let _e229 = rayCone;
    let _e230 = rd_24;
    let _e231 = fwidth(_e230);
    rayCone = max(_e229, (length(_e231) * 0.5f));
    let _e236 = rayCone;
    gRayCone = _e236;
    let _e237 = ro_17;
    let _e238 = rd_24;
    let _e239 = march(_e237, _e238);
    hit_2 = _e239;
    let _e246 = hit_2;
    let _e250 = hit_2;
    if ((_e246.y > 0.5f) && (_e250.x < 24f)) {
        {
            let _e255 = ro_17;
            let _e256 = rd_24;
            let _e257 = hit_2;
            p_129 = (_e255 + (_e256 * _e257.x));
            let _e262 = gHitNormal;
            geometric_8 = _e262;
            let _e264 = hit_2;
            let _e266 = rayCone;
            let _e268 = geometric_8;
            let _e269 = rd_24;
            gFootprint = clamp(((_e264.x * _e266) / max(abs(dot(_e268, _e269)), 0.22f)), 0.0005f, 0.1f);
            let _e278 = p_129;
            let _e279 = geometric_8;
            let _e280 = hit_2;
            let _e282 = rd_24;
            let _e283 = shade(_e278, _e279, _e280.y, _e282);
            col_1 = _e283;
        }
    }
    let _e284 = col_1;
    let _e285 = ro_17;
    let _e286 = rd_24;
    let _e287 = hit_2;
    let _e291 = atmosphere(_e284, _e285, _e286, min(_e287.x, 24f));
    col_1 = _e291;
    let _e292 = vUv_1;
    q_17 = (_e292 - vec2(0.5f));
    let _e297 = col_1;
    let _e301 = q_17;
    let _e302 = q_17;
    col_1 = (_e297 * (1f - (smoothstep(0.2f, 0.64f, dot(_e301, _e302)) * 0.12f)));
    let _e309 = col_1;
    lum = dot(_e309, vec3<f32>(0.2126f, 0.7152f, 0.0722f));
    let _e316 = col_1;
    let _e327 = lum;
    col_1 = (_e316 * mix(vec3<f32>(0.97f, 0.99f, 1.035f), vec3<f32>(1.025f, 1f, 0.975f), vec3(smoothstep(0.1f, 0.8f, _e327))));
    let _e332 = col_1;
    let _e333 = uniforms;
    col_1 = (_e332 * max(_e333.uLook.x, 0.5f));
    let _e339 = col_1;
    let _e343 = max(_e339, vec3(0f));
    fragColor = vec4<f32>(_e343.x, _e343.y, _e343.z, 1f);
    return;
}

@fragment
fn main(@location(0) vUv: vec2<f32>, @builtin(position) gl_FragCoord: vec4<f32>) -> FragmentOutput {
    vUv_1 = vUv;
    gl_FragCoord_1 = gl_FragCoord;
    main_1();
    let _e249 = fragColor;
    return FragmentOutput(_e249);
}
