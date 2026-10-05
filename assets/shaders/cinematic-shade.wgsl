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
var<private> gSurfaceGradient: vec3<f32> = vec3(0f);
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
    let _e202 = uniforms;
    let _e205 = uniforms;
    let _e209 = uniforms;
    return ((_e202.uTime.x + _e205.uTransition.w) * _e209.uLook.w);
}

fn hash(p: vec2<f32>) -> f32 {
    var p_1: vec2<f32>;

    p_1 = p;
    let _e204 = p_1;
    const _e206 = vec2(251f);
    p_1 = (_e204 - (floor((_e204 / _e206)) * _e206));
    let _e212 = p_1;
    let _e216 = p_1;
    let _e223 = p_1;
    let _e227 = p_1;
    return fract(((17f * fract(((_e212.x * 0.1031f) + (_e216.y * 0.11369f)))) * fract(((_e223.y * 0.13787f) + (_e227.x * 0.09987f)))));
}

fn noise(p_2: vec2<f32>) -> f32 {
    var p_3: vec2<f32>;
    var i: vec2<f32>;
    var f: vec2<f32>;
    var u: vec2<f32>;

    p_3 = p_2;
    let _e204 = p_3;
    i = floor(_e204);
    let _e207 = p_3;
    f = fract(_e207);
    let _e210 = f;
    let _e211 = f;
    let _e213 = f;
    let _e215 = f;
    let _e216 = f;
    u = (((_e210 * _e211) * _e213) * ((_e215 * ((_e216 * 6f) - vec2(15f))) + vec2(10f)));
    let _e228 = i;
    let _e229 = hash(_e228);
    let _e230 = i;
    let _e237 = hash((_e230 + vec2<f32>(1f, 0f)));
    let _e238 = u;
    let _e241 = i;
    let _e248 = hash((_e241 + vec2<f32>(0f, 1f)));
    let _e249 = i;
    let _e256 = hash((_e249 + vec2<f32>(1f, 1f)));
    let _e257 = u;
    let _e260 = u;
    return mix(mix(_e229, _e237, _e238.x), mix(_e248, _e256, _e257.x), _e260.y);
}

fn detailWeight(frequency: f32) -> f32 {
    var frequency_1: f32;

    frequency_1 = frequency;
    let _e207 = gFootprint;
    let _e208 = frequency_1;
    return (1f - smoothstep(0.16f, 0.65f, (_e207 * _e208)));
}

fn filteredNoise(p_4: vec2<f32>, frequency_2: f32) -> f32 {
    var p_5: vec2<f32>;
    var frequency_3: f32;

    p_5 = p_4;
    frequency_3 = frequency_2;
    let _e207 = p_5;
    let _e208 = noise(_e207);
    let _e209 = frequency_3;
    let _e210 = detailWeight(_e209);
    return mix(0.5f, _e208, _e210);
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
        let _e212 = i_1;
        if !((_e212 < 7i)) {
            break;
        }
        {
            let _e219 = frequency_5;
            let _e220 = detailWeight(_e219);
            w = _e220;
            let _e222 = v;
            let _e223 = a;
            let _e225 = p_7;
            let _e226 = noise(_e225);
            let _e227 = w;
            v = (_e222 + (_e223 * mix(0.5f, _e226, _e227)));
            let _e239 = p_7;
            p_7 = (((mat2x2<f32>(vec2<f32>(0.8f, -0.6f), vec2<f32>(0.6f, 0.8f)) * _e239) * 2.03f) + vec2<f32>(3.7f, 1.9f));
            let _e247 = frequency_5;
            frequency_5 = (_e247 * 2.03f);
            let _e250 = a;
            a = (_e250 * 0.5f);
        }
        continuing {
            let _e216 = i_1;
            i_1 = (_e216 + 1i);
        }
    }
    let _e253 = v;
    return _e253;
}

fn aaLine(distanceToLine: f32, halfWidth: f32) -> f32 {
    var distanceToLine_1: f32;
    var halfWidth_1: f32;
    var w_1: f32;

    distanceToLine_1 = distanceToLine;
    halfWidth_1 = halfWidth;
    let _e206 = gFootprint;
    w_1 = max(_e206, 0.0005f);
    let _e211 = halfWidth_1;
    let _e212 = w_1;
    let _e214 = halfWidth_1;
    let _e215 = w_1;
    let _e217 = distanceToLine_1;
    return (1f - smoothstep((_e211 - _e212), (_e214 + _e215), _e217));
}

fn includeCandidate(key: f32) -> bool {
    var key_1: f32;

    key_1 = key;
    let _e204 = gForcedCandidate;
    if (_e204 > 0f) {
        let _e207 = key_1;
        let _e208 = gForcedCandidate;
        return (_e207 == _e208);
    }
    let _e210 = gExcludedCandidates;
    let _e211 = key_1;
    return all((_e210 != vec3(_e211)));
}

fn includeSceneCandidate(key_2: f32) -> bool {
    var key_3: f32;

    key_3 = key_2;
    return true;
}

fn qrot(q: vec4<f32>, v_1: vec3<f32>) -> vec3<f32> {
    var q_1: vec4<f32>;
    var v_2: vec3<f32>;

    q_1 = q;
    v_2 = v_1;
    let _e206 = v_2;
    let _e208 = q_1;
    let _e210 = q_1;
    let _e212 = v_2;
    let _e214 = q_1;
    let _e216 = v_2;
    return (_e206 + (2f * cross(_e208.xyz, (cross(_e210.xyz, _e212) + (_e214.w * _e216)))));
}

fn sdBox(p_8: vec3<f32>, b: vec3<f32>) -> f32 {
    var p_9: vec3<f32>;
    var b_1: vec3<f32>;
    var q_2: vec3<f32>;

    p_9 = p_8;
    b_1 = b;
    let _e206 = p_9;
    let _e208 = b_1;
    q_2 = (abs(_e206) - _e208);
    let _e211 = q_2;
    let _e216 = q_2;
    let _e218 = q_2;
    let _e220 = q_2;
    return (length(max(_e211, vec3(0f))) + min(max(_e216.x, max(_e218.y, _e220.z)), 0f));
}

fn sdRoundBox(p_10: vec3<f32>, b_2: vec3<f32>, r: f32) -> f32 {
    var p_11: vec3<f32>;
    var b_3: vec3<f32>;
    var r_1: f32;
    var q_3: vec3<f32>;

    p_11 = p_10;
    b_3 = b_2;
    r_1 = r;
    let _e208 = p_11;
    let _e210 = b_3;
    let _e212 = r_1;
    q_3 = ((abs(_e208) - _e210) + vec3(_e212));
    let _e216 = q_3;
    let _e221 = q_3;
    let _e223 = q_3;
    let _e225 = q_3;
    let _e232 = r_1;
    return ((length(max(_e216, vec3(0f))) + min(max(_e221.x, max(_e223.y, _e225.z)), 0f)) - _e232);
}

fn sdCyl(p_12: vec3<f32>, r_2: f32, h: f32) -> f32 {
    var p_13: vec3<f32>;
    var r_3: f32;
    var h_1: f32;
    var d: vec2<f32>;

    p_13 = p_12;
    r_3 = r_2;
    h_1 = h;
    let _e208 = p_13;
    let _e211 = p_13;
    let _e215 = r_3;
    let _e216 = h_1;
    d = (abs(vec2<f32>(length(_e208.xz), _e211.y)) - vec2<f32>(_e215, _e216));
    let _e220 = d;
    let _e222 = d;
    let _e227 = d;
    return (min(max(_e220.x, _e222.y), 0f) + length(max(_e227, vec2(0f))));
}

fn sdRing(p_14: vec3<f32>) -> f32 {
    var p_15: vec3<f32>;
    var q_4: vec2<f32>;

    p_15 = p_14;
    let _e204 = p_15;
    let _e212 = p_15;
    q_4 = vec2<f32>((abs((length(_e204.xz) - 0.45f)) - 0.065f), (abs(_e212.y) - 0.018f));
    let _e219 = q_4;
    let _e221 = q_4;
    let _e226 = q_4;
    return (min(max(_e219.x, _e221.y), 0f) + length(max(_e226, vec2(0f))));
}

fn opU(a_1: vec2<f32>, b_4: vec2<f32>) -> vec2<f32> {
    var a_2: vec2<f32>;
    var b_5: vec2<f32>;
    var local: vec2<f32>;

    a_2 = a_1;
    b_5 = b_4;
    let _e206 = b_5;
    let _e208 = a_2;
    if (_e206.x < _e208.x) {
        let _e211 = b_5;
        local = _e211;
    } else {
        let _e212 = a_2;
        local = _e212;
    }
    let _e214 = local;
    return _e214;
}

fn obstacle(p_16: vec3<f32>, o: vec4<f32>) -> vec2<f32> {
    var p_17: vec3<f32>;
    var o_1: vec4<f32>;

    p_17 = p_16;
    o_1 = o;
    let _e206 = o_1;
    if (_e206.z <= 0.001f) {
        return vec2<f32>(100f, 0f);
    }
    let _e215 = p_17;
    let _e216 = o_1;
    let _e219 = o_1;
    let _e223 = o_1;
    let _e228 = o_1;
    let _e234 = sdRoundBox((_e215 - vec3<f32>(_e216.x, 0.245f, _e219.y)), vec3<f32>((_e223.z * 0.5f), 0.245f, (_e228.w * 0.5f)), 0.045f);
    return vec2<f32>(_e234, 8f);
}

fn zoneDimensions(z: vec4<f32>, shape: vec4<f32>) -> vec3<f32> {
    var z_1: vec4<f32>;
    var shape_1: vec4<f32>;

    z_1 = z;
    shape_1 = shape;
    let _e206 = shape_1;
    let _e208 = z_1;
    let _e213 = shape_1;
    return (_e206.xyz + (vec3(_e208.z) * (1f - step(0.0001f, _e213.x))));
}

fn zoneRotation(basis: vec4<f32>) -> vec2<f32> {
    var basis_1: vec4<f32>;

    basis_1 = basis;
    let _e204 = basis_1;
    let _e213 = basis_1;
    let _e215 = basis_1;
    return (_e204.xy + (vec2<f32>(1f, 0f) * (1f - step(0.5f, dot(_e213.xy, _e215.xy)))));
}

fn zoneLocal(p_18: vec2<f32>, basis_2: vec2<f32>) -> vec2<f32> {
    var p_19: vec2<f32>;
    var basis_3: vec2<f32>;

    p_19 = p_18;
    basis_3 = basis_2;
    let _e206 = p_19;
    let _e207 = basis_3;
    let _e209 = p_19;
    let _e210 = basis_3;
    let _e213 = basis_3;
    return vec2<f32>(dot(_e206, _e207), dot(_e209, vec2<f32>(-(_e210.y), _e213.x)));
}

fn sdZoneFootprint(p_20: vec2<f32>, shape_2: vec3<f32>) -> f32 {
    var p_21: vec2<f32>;
    var shape_3: vec3<f32>;
    var d_1: vec2<f32>;

    p_21 = p_20;
    shape_3 = shape_2;
    let _e206 = p_21;
    let _e208 = shape_3;
    let _e211 = shape_3;
    d_1 = ((abs(_e206) - _e208.xy) + vec2(_e211.z));
    let _e216 = d_1;
    let _e221 = d_1;
    let _e223 = d_1;
    let _e229 = shape_3;
    return ((length(max(_e216, vec2(0f))) + min(max(_e221.x, _e223.y), 0f)) - _e229.z);
}

fn zonePlate(p_22: vec3<f32>, shape_4: vec3<f32>, basis_4: vec2<f32>) -> f32 {
    var p_23: vec3<f32>;
    var shape_5: vec3<f32>;
    var basis_5: vec2<f32>;
    var d_2: vec2<f32>;

    p_23 = p_22;
    shape_5 = shape_4;
    basis_5 = basis_4;
    let _e208 = p_23;
    let _e210 = basis_5;
    let _e211 = zoneLocal(_e208.xz, _e210);
    let _e212 = shape_5;
    let _e213 = sdZoneFootprint(_e211, _e212);
    let _e214 = p_23;
    d_2 = vec2<f32>(_e213, (abs(_e214.y) - 0.012f));
    let _e221 = d_2;
    let _e223 = d_2;
    let _e228 = d_2;
    return (min(max(_e221.x, _e223.y), 0f) + length(max(_e228, vec2(0f))));
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
    let _e210 = motion_1;
    legacy = (1f - step(0.001f, _e210.z));
    let _e215 = motion_1;
    let _e217 = legacy;
    let _e218 = footprintRadius_1;
    let _e219 = footprintRadius_1;
    radius = (_e215.z + (_e217 * (((_e218 * _e219) / 0.28f) + 0.07f)));
    let _e228 = motion_1;
    let _e230 = legacy;
    let _e232 = radius;
    centre = (_e228.w + (_e230 * (0.152f - _e232)));
    let _e237 = p_25;
    let _e239 = p_25;
    let _e243 = centre;
    let _e245 = p_25;
    let _e249 = radius;
    let _e251 = centre;
    let _e252 = radius;
    let _e256 = motion_1;
    let _e263 = p_25;
    return max((length(vec3<f32>(_e237.x, ((_e239.y + 0.016f) - _e243), _e245.z)) - _e249), ((((_e251 + _e252) - (0.14f * (1f - _e256.x))) - 0.016f) - _e263.y));
}

fn zoneBase(motion_2: vec4<f32>, type_45: f32) -> f32 {
    var motion_3: vec4<f32>;
    var type_46: f32;
    var local_1: f32;

    motion_3 = motion_2;
    type_46 = type_45;
    let _e206 = type_46;
    let _e209 = motion_3;
    if ((_e206 > 4.5f) && (_e209.z > 0.001f)) {
        let _e214 = motion_3;
        let _e216 = motion_3;
        let _e221 = motion_3;
        local_1 = (((_e214.w + _e216.z) - (0.14f * (1f - _e221.x))) - 0.012f);
    } else {
        local_1 = 0f;
    }
    let _e230 = local_1;
    return _e230;
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
    let _e212 = z_3;
    if (_e212.w < 0.5f) {
        return vec2<f32>(100f, 0f);
    }
    let _e221 = p_27;
    let _e222 = z_3;
    let _e225 = z_3;
    local_2 = (_e221 - vec3<f32>(_e222.x, 0.016f, _e225.y));
    let _e230 = z_3;
    let _e231 = shape_7;
    let _e232 = zoneDimensions(_e230, _e231);
    size = _e232;
    let _e234 = z_3;
    if (_e234.w > 4.5f) {
        let _e238 = local_2;
        let _e239 = size;
        let _e241 = motion_5;
        let _e242 = jumpCap(_e238, _e239.x, _e241);
        local_3 = _e242;
    } else {
        let _e243 = local_2;
        let _e244 = size;
        let _e245 = basis_7;
        let _e246 = zoneRotation(_e245);
        let _e247 = zonePlate(_e243, _e244, _e246);
        local_3 = _e247;
    }
    let _e249 = local_3;
    d_3 = _e249;
    let _e251 = d_3;
    let _e253 = z_3;
    return vec2<f32>(_e251, (15f + _e253.w));
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
    let _e210 = p_29;
    let _e211 = p_29;
    let _e213 = warp_1;
    let _e216 = p_29;
    let _e218 = warp_1;
    let _e222 = p_29;
    let _e224 = extent_1;
    let _e227 = warp_1;
    let _e230 = p_29;
    let _e232 = warp_1;
    let _e235 = p_29;
    let _e237 = warp_1;
    local_4 = (_e210 + vec3<f32>(((_e211.x * _e213.x) + (_e216.z * _e218.y)), ((_e222.y + _e224.y) * _e227.w), ((_e230.x * _e232.y) + (_e235.z * _e237.z))));
    let _e244 = local_4;
    let _e245 = extent_1;
    let _e247 = extent_1;
    let _e249 = sdCyl(_e244, _e245.x, _e247.y);
    let _e251 = compression_1;
    let _e256 = compression_1;
    return (_e249 * min((1f - (_e251 * 0.8f)), (1f + (_e256 * 0.5f))));
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
    let _e210 = b_7;
    if (_e210.z < 0.01f) {
        return vec2<f32>(100f, 0f);
    }
    let _e219 = b_7;
    h_2 = max(_e219.w, 0.34f);
    let _e224 = p_31;
    let _e225 = b_7;
    let _e227 = h_2;
    let _e230 = b_7;
    let _e234 = b_7;
    let _e236 = h_2;
    let _e239 = b_7;
    let _e242 = fx_1;
    let _e244 = warp_3;
    let _e245 = jellyDistance((_e224 - vec3<f32>(_e225.x, (_e227 * 0.5f), _e230.y)), vec3<f32>(_e234.z, (_e236 * 0.5f), _e239.z), _e242.x, _e244);
    return vec2<f32>(_e245, 22f);
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
    let _e208 = meta_1;
    if (length(_e208.yz) < 0.00001f) {
        local_5 = vec2<f32>(0f, -1f);
    } else {
        let _e219 = meta_1;
        local_5 = normalize(_e219.yz);
    }
    let _e223 = local_5;
    dir = _e223;
    let _e225 = dir;
    let _e228 = r_5;
    let _e231 = dir;
    let _e234 = r_5;
    span = max(((abs(_e225.x) * _e228.z) + (abs(_e231.y) * _e234.w)), 0.00001f);
    let _e241 = xz_1;
    let _e242 = r_5;
    let _e245 = dir;
    let _e247 = span;
    along = clamp(((dot((_e241 - _e242.xy), _e245) / _e247) + 0.5f), 0f, 1f);
    let _e255 = meta_1;
    let _e257 = along;
    let _e258 = meta_1;
    let _e260 = meta_1;
    return (_e255.w + (_e257 * (_e258.x - _e260.w)));
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
    let _e208 = r_7;
    if (_e208.z <= 0.001f) {
        return vec2<f32>(100f, 0f);
    }
    let _e217 = p_33;
    let _e219 = r_7;
    let _e220 = meta_3;
    let _e221 = rampHeight(_e217.xz, _e219, _e220);
    h_3 = _e221;
    let _e223 = p_33;
    let _e225 = r_7;
    let _e229 = r_7;
    d_4 = (abs((_e223.xz - _e225.xy)) - (_e229.zw * 0.5f));
    let _e235 = meta_3;
    if (length(_e235.yz) < 0.00001f) {
        local_6 = vec2<f32>(0f, -1f);
    } else {
        let _e246 = meta_3;
        local_6 = normalize(_e246.yz);
    }
    let _e250 = local_6;
    dir_1 = _e250;
    let _e252 = meta_3;
    let _e254 = meta_3;
    let _e257 = dir_1;
    let _e260 = r_7;
    let _e263 = dir_1;
    let _e266 = r_7;
    slope = ((_e252.x - _e254.w) / max(((abs(_e257.x) * _e260.z) + (abs(_e263.y) * _e266.w)), 0.001f));
    let _e274 = d_4;
    let _e276 = d_4;
    let _e279 = p_33;
    let _e281 = h_3;
    let _e284 = slope;
    let _e285 = slope;
    let _e291 = meta_3;
    let _e293 = p_33;
    return vec2<f32>(max(max(max(_e274.x, _e276.y), ((_e279.y - _e281) / sqrt((1f + (_e284 * _e285))))), ((_e291.w - _e293.y) - 0.025f)), 19f);
}

fn platformObj(p_34: vec3<f32>, r_8: vec4<f32>, meta_4: vec4<f32>) -> vec2<f32> {
    var p_35: vec3<f32>;
    var r_9: vec4<f32>;
    var meta_5: vec4<f32>;
    var h_4: f32;

    p_35 = p_34;
    r_9 = r_8;
    meta_5 = meta_4;
    let _e208 = r_9;
    if (_e208.z <= 0.001f) {
        return vec2<f32>(100f, 0f);
    }
    let _e217 = meta_5;
    h_4 = max(_e217.x, 0.03f);
    let _e222 = p_35;
    let _e223 = r_9;
    let _e225 = h_4;
    let _e228 = r_9;
    let _e232 = r_9;
    let _e236 = h_4;
    let _e239 = r_9;
    let _e245 = sdRoundBox((_e222 - vec3<f32>(_e223.x, (_e225 * 0.5f), _e228.y)), vec3<f32>((_e232.z * 0.5f), (_e236 * 0.5f), (_e239.w * 0.5f)), 0.018f);
    return vec2<f32>(_e245, 19f);
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
    let _e211 = includeSceneCandidate(100f);
    if _e211 {
        let _e212 = r_10;
        let _e213 = p_37;
        let _e226 = sdBox((_e213 - vec3<f32>(0f, -0.055f, 0f)), vec3<f32>(3.25f, 0.055f, 3.25f));
        let _e229 = opU(_e212, vec2<f32>(_e226, 1f));
        r_10 = _e229;
    }
    let _e231 = includeSceneCandidate(200f);
    if _e231 {
        let _e232 = r_10;
        let _e233 = p_37;
        let _e245 = sdRoundBox((_e233 - vec3<f32>(0f, 0.005f, 0.78f)), vec3<f32>(2.08f, 0.005f, 1.27f), 0.004f);
        let _e248 = opU(_e232, vec2<f32>(_e245, 2f));
        r_10 = _e248;
    }
    let _e250 = includeSceneCandidate(300f);
    if _e250 {
        let _e251 = r_10;
        let _e252 = p_37;
        let _e264 = sdBox((_e252 - vec3<f32>(0f, 1.58f, -3.23f)), vec3<f32>(3.25f, 1.62f, 0.045f));
        let _e267 = opU(_e251, vec2<f32>(_e264, 3f));
        r_10 = _e267;
    }
    let _e269 = includeSceneCandidate(400f);
    if _e269 {
        let _e270 = r_10;
        let _e271 = p_37;
        let _e283 = sdBox((_e271 - vec3<f32>(-3.23f, 1.58f, 0f)), vec3<f32>(0.045f, 1.62f, 3.25f));
        let _e286 = opU(_e270, vec2<f32>(_e283, 4f));
        r_10 = _e286;
    }
    let _e288 = includeSceneCandidate(500f);
    if _e288 {
        let _e289 = r_10;
        let _e290 = p_37;
        let _e301 = sdBox((_e290 - vec3<f32>(3.23f, 1.58f, 0f)), vec3<f32>(0.045f, 1.62f, 3.25f));
        let _e304 = opU(_e289, vec2<f32>(_e301, 5f));
        r_10 = _e304;
    }
    let _e306 = includeSceneCandidate(600f);
    if _e306 {
        let _e307 = r_10;
        let _e308 = p_37;
        let _e320 = sdBox((_e308 - vec3<f32>(0f, 3.18f, 0f)), vec3<f32>(3.25f, 0.045f, 3.25f));
        let _e323 = opU(_e307, vec2<f32>(_e320, 6f));
        r_10 = _e323;
    }
    let _e325 = includeSceneCandidate(1401f);
    if _e325 {
        let _e326 = r_10;
        let _e327 = p_37;
        let _e340 = sdRoundBox((_e327 - vec3<f32>(0f, 0.115f, -3.155f)), vec3<f32>(3.18f, 0.105f, 0.045f), 0.02f);
        let _e343 = opU(_e326, vec2<f32>(_e340, 14f));
        r_10 = _e343;
    }
    let _e345 = includeSceneCandidate(1402f);
    if _e345 {
        let _e346 = r_10;
        let _e347 = p_37;
        let _e360 = sdRoundBox((_e347 - vec3<f32>(-3.155f, 0.115f, 0f)), vec3<f32>(0.045f, 0.105f, 3.18f), 0.02f);
        let _e363 = opU(_e346, vec2<f32>(_e360, 14f));
        r_10 = _e363;
    }
    let _e365 = includeSceneCandidate(1403f);
    if _e365 {
        let _e366 = r_10;
        let _e367 = p_37;
        let _e379 = sdRoundBox((_e367 - vec3<f32>(3.155f, 0.115f, 0f)), vec3<f32>(0.045f, 0.105f, 3.18f), 0.02f);
        let _e382 = opU(_e366, vec2<f32>(_e379, 14f));
        r_10 = _e382;
    }
    let _e383 = r_10;
    let _e384 = p_37;
    let _e397 = sdRoundBox((_e384 - vec3<f32>(0f, 3.095f, -1.65f)), vec3<f32>(1.95f, 0.025f, 0.032f), 0.012f);
    let _e400 = opU(_e383, vec2<f32>(_e397, 13f));
    r_10 = _e400;
    let _e401 = r_10;
    let _e402 = p_37;
    let _e415 = sdRoundBox((_e402 - vec3<f32>(-1.95f, 3.095f, -0.4f)), vec3<f32>(0.032f, 0.025f, 1.3f), 0.012f);
    let _e418 = opU(_e401, vec2<f32>(_e415, 13f));
    r_10 = _e418;
    let _e419 = r_10;
    let _e420 = p_37;
    let _e432 = sdRoundBox((_e420 - vec3<f32>(1.95f, 3.095f, -0.4f)), vec3<f32>(0.032f, 0.025f, 1.3f), 0.012f);
    let _e435 = opU(_e419, vec2<f32>(_e432, 13f));
    r_10 = _e435;
    let _e436 = r_10;
    let _e437 = p_37;
    let _e438 = uniforms;
    let _e440 = uniforms;
    let _e442 = uniforms;
    let _e444 = uniforms;
    let _e446 = zoneObj(_e437, _e438.uZone0_, _e440.uZoneShape0_, _e442.uZoneBasis0_, _e444.uZoneMotion0_);
    let _e447 = opU(_e436, _e446);
    r_10 = _e447;
    let _e448 = r_10;
    let _e449 = p_37;
    let _e450 = uniforms;
    let _e452 = uniforms;
    let _e454 = uniforms;
    let _e456 = uniforms;
    let _e458 = zoneObj(_e449, _e450.uZone1_, _e452.uZoneShape1_, _e454.uZoneBasis1_, _e456.uZoneMotion1_);
    let _e459 = opU(_e448, _e458);
    r_10 = _e459;
    let _e460 = r_10;
    let _e461 = p_37;
    let _e462 = uniforms;
    let _e464 = uniforms;
    let _e466 = uniforms;
    let _e468 = uniforms;
    let _e470 = zoneObj(_e461, _e462.uZone2_, _e464.uZoneShape2_, _e466.uZoneBasis2_, _e468.uZoneMotion2_);
    let _e471 = opU(_e460, _e470);
    r_10 = _e471;
    let _e472 = r_10;
    let _e473 = p_37;
    let _e474 = uniforms;
    let _e476 = uniforms;
    let _e478 = uniforms;
    let _e480 = uniforms;
    let _e482 = zoneObj(_e473, _e474.uZone3_, _e476.uZoneShape3_, _e478.uZoneBasis3_, _e480.uZoneMotion3_);
    let _e483 = opU(_e472, _e482);
    r_10 = _e483;
    let _e484 = r_10;
    let _e485 = p_37;
    let _e486 = uniforms;
    let _e488 = uniforms;
    let _e490 = uniforms;
    let _e492 = uniforms;
    let _e494 = zoneObj(_e485, _e486.uZone4_, _e488.uZoneShape4_, _e490.uZoneBasis4_, _e492.uZoneMotion4_);
    let _e495 = opU(_e484, _e494);
    r_10 = _e495;
    let _e496 = r_10;
    let _e497 = p_37;
    let _e498 = uniforms;
    let _e500 = uniforms;
    let _e502 = uniforms;
    let _e504 = uniforms;
    let _e506 = zoneObj(_e497, _e498.uZone5_, _e500.uZoneShape5_, _e502.uZoneBasis5_, _e504.uZoneMotion5_);
    let _e507 = opU(_e496, _e506);
    r_10 = _e507;
    let _e508 = r_10;
    let _e509 = p_37;
    let _e510 = uniforms;
    let _e512 = uniforms;
    let _e514 = uniforms;
    let _e516 = uniforms;
    let _e518 = zoneObj(_e509, _e510.uZone6_, _e512.uZoneShape6_, _e514.uZoneBasis6_, _e516.uZoneMotion6_);
    let _e519 = opU(_e508, _e518);
    r_10 = _e519;
    let _e520 = r_10;
    let _e521 = p_37;
    let _e522 = uniforms;
    let _e524 = uniforms;
    let _e526 = uniforms;
    let _e528 = uniforms;
    let _e530 = zoneObj(_e521, _e522.uZone7_, _e524.uZoneShape7_, _e526.uZoneBasis7_, _e528.uZoneMotion7_);
    let _e531 = opU(_e520, _e530);
    r_10 = _e531;
    let _e533 = includeSceneCandidate(1921f);
    if _e533 {
        let _e534 = r_10;
        let _e535 = p_37;
        let _e536 = uniforms;
        let _e538 = uniforms;
        let _e540 = rampObj(_e535, _e536.uRamp0_, _e538.uRampMeta0_);
        let _e541 = opU(_e534, _e540);
        r_10 = _e541;
    }
    let _e543 = includeSceneCandidate(1922f);
    if _e543 {
        let _e544 = r_10;
        let _e545 = p_37;
        let _e546 = uniforms;
        let _e548 = uniforms;
        let _e550 = rampObj(_e545, _e546.uRamp1_, _e548.uRampMeta1_);
        let _e551 = opU(_e544, _e550);
        r_10 = _e551;
    }
    let _e553 = includeSceneCandidate(1923f);
    if _e553 {
        let _e554 = r_10;
        let _e555 = p_37;
        let _e556 = uniforms;
        let _e558 = uniforms;
        let _e560 = rampObj(_e555, _e556.uRamp2_, _e558.uRampMeta2_);
        let _e561 = opU(_e554, _e560);
        r_10 = _e561;
    }
    let _e563 = includeSceneCandidate(1911f);
    if _e563 {
        let _e564 = r_10;
        let _e565 = p_37;
        let _e566 = uniforms;
        let _e568 = uniforms;
        let _e570 = platformObj(_e565, _e566.uPlat0_, _e568.uPlatMeta0_);
        let _e571 = opU(_e564, _e570);
        r_10 = _e571;
    }
    let _e573 = includeSceneCandidate(1912f);
    if _e573 {
        let _e574 = r_10;
        let _e575 = p_37;
        let _e576 = uniforms;
        let _e578 = uniforms;
        let _e580 = platformObj(_e575, _e576.uPlat1_, _e578.uPlatMeta1_);
        let _e581 = opU(_e574, _e580);
        r_10 = _e581;
    }
    let _e583 = includeSceneCandidate(1913f);
    if _e583 {
        let _e584 = r_10;
        let _e585 = p_37;
        let _e586 = uniforms;
        let _e588 = uniforms;
        let _e590 = platformObj(_e585, _e586.uPlat2_, _e588.uPlatMeta2_);
        let _e591 = opU(_e584, _e590);
        r_10 = _e591;
    }
    let _e593 = includeSceneCandidate(1914f);
    if _e593 {
        let _e594 = r_10;
        let _e595 = p_37;
        let _e596 = uniforms;
        let _e598 = uniforms;
        let _e600 = platformObj(_e595, _e596.uPlat3_, _e598.uPlatMeta3_);
        let _e601 = opU(_e594, _e600);
        r_10 = _e601;
    }
    let _e602 = uniforms;
    if (_e602.uTargetType.x < 3.5f) {
        {
            let _e607 = p_37;
            let _e608 = uniforms;
            let _e613 = uniforms;
            let _e617 = uniforms;
            tp = (_e607 - vec3<f32>(_e608.uTarget.x, (0.035f + _e613.uTargetY.x), _e617.uTarget.y));
            let _e624 = uniforms;
            if (_e624.uTargetType.x < 2.5f) {
                let _e629 = tp;
                let _e632 = sdCyl(_e629, 0.49f, 0.02f);
                local_7 = _e632;
            } else {
                let _e633 = tp;
                let _e634 = sdRing(_e633);
                local_7 = _e634;
            }
            let _e636 = local_7;
            d_5 = _e636;
            let _e638 = r_10;
            let _e639 = d_5;
            let _e641 = uniforms;
            let _e646 = opU(_e638, vec2<f32>(_e639, (9f + _e641.uTargetType.x)));
            r_10 = _e646;
        }
    } else {
        {
            let _e647 = r_10;
            let _e648 = p_37;
            let _e649 = uniforms;
            let _e654 = uniforms;
            let _e667 = sdRoundBox((_e648 - vec3<f32>(_e649.uTarget.x, (0.74f + _e654.uTargetY.x), -3.185f)), vec3<f32>(0.58f, 0.7f, 0.03f), 0.045f);
            let _e670 = opU(_e647, vec2<f32>(_e667, 15f));
            r_10 = _e670;
            let _e671 = r_10;
            let _e672 = p_37;
            let _e673 = uniforms;
            let _e678 = uniforms;
            let _e682 = uniforms;
            let _e688 = sdRing((_e672 - vec3<f32>(_e673.uTarget.x, (0.03f + _e678.uTargetY.x), _e682.uTarget.y)));
            let _e691 = opU(_e671, vec2<f32>(_e688, 15f));
            r_10 = _e691;
        }
    }
    let _e693 = includeSceneCandidate(801f);
    if _e693 {
        let _e694 = r_10;
        let _e695 = p_37;
        let _e696 = uniforms;
        let _e698 = obstacle(_e695, _e696.uObs0_);
        let _e699 = opU(_e694, _e698);
        r_10 = _e699;
    }
    let _e701 = includeSceneCandidate(802f);
    if _e701 {
        let _e702 = r_10;
        let _e703 = p_37;
        let _e704 = uniforms;
        let _e706 = obstacle(_e703, _e704.uObs1_);
        let _e707 = opU(_e702, _e706);
        r_10 = _e707;
    }
    let _e709 = includeSceneCandidate(803f);
    if _e709 {
        let _e710 = r_10;
        let _e711 = p_37;
        let _e712 = uniforms;
        let _e714 = obstacle(_e711, _e712.uObs2_);
        let _e715 = opU(_e710, _e714);
        r_10 = _e715;
    }
    let _e717 = includeSceneCandidate(804f);
    if _e717 {
        let _e718 = r_10;
        let _e719 = p_37;
        let _e720 = uniforms;
        let _e722 = obstacle(_e719, _e720.uObs3_);
        let _e723 = opU(_e718, _e722);
        r_10 = _e723;
    }
    let _e725 = includeSceneCandidate(805f);
    if _e725 {
        let _e726 = r_10;
        let _e727 = p_37;
        let _e728 = uniforms;
        let _e730 = obstacle(_e727, _e728.uObs4_);
        let _e731 = opU(_e726, _e730);
        r_10 = _e731;
    }
    let _e733 = includeSceneCandidate(806f);
    if _e733 {
        let _e734 = r_10;
        let _e735 = p_37;
        let _e736 = uniforms;
        let _e738 = obstacle(_e735, _e736.uObs5_);
        let _e739 = opU(_e734, _e738);
        r_10 = _e739;
    }
    let _e741 = includeSceneCandidate(2241f);
    if _e741 {
        let _e742 = r_10;
        let _e743 = p_37;
        let _e744 = uniforms;
        let _e746 = uniforms;
        let _e748 = uniforms;
        let _e750 = bumperObj(_e743, _e744.uBump0_, _e746.uBumpFx0_, _e748.uBumpWarp0_);
        let _e751 = opU(_e742, _e750);
        r_10 = _e751;
    }
    let _e753 = includeSceneCandidate(2242f);
    if _e753 {
        let _e754 = r_10;
        let _e755 = p_37;
        let _e756 = uniforms;
        let _e758 = uniforms;
        let _e760 = uniforms;
        let _e762 = bumperObj(_e755, _e756.uBump1_, _e758.uBumpFx1_, _e760.uBumpWarp1_);
        let _e763 = opU(_e754, _e762);
        r_10 = _e763;
    }
    let _e765 = includeSceneCandidate(2243f);
    if _e765 {
        let _e766 = r_10;
        let _e767 = p_37;
        let _e768 = uniforms;
        let _e770 = uniforms;
        let _e772 = uniforms;
        let _e774 = bumperObj(_e767, _e768.uBump2_, _e770.uBumpFx2_, _e772.uBumpWarp2_);
        let _e775 = opU(_e766, _e774);
        r_10 = _e775;
    }
    let _e776 = uniforms;
    let _e779 = -(_e776.uCubeQ.xyz);
    let _e780 = uniforms;
    iq = vec4<f32>(_e779.x, _e779.y, _e779.z, _e780.uCubeQ.w);
    let _e788 = iq;
    let _e789 = p_37;
    let _e790 = cubeCenter();
    let _e792 = qrot(_e788, (_e789 - _e790));
    cp = _e792;
    let _e795 = includeSceneCandidate(700f);
    let _e797 = uniforms;
    if (!(_e795) || (_e797.uTransition.x < 0.008f)) {
        let _e803 = r_10;
        return _e803;
    }
    let _e804 = r_10;
    let _e805 = cp;
    let _e808 = cubeScale();
    let _e811 = cubeScale();
    let _e813 = sdRoundBox(_e805, (vec3(0.245f) * _e808), (0.038f * _e811));
    let _e816 = opU(_e804, vec2<f32>(_e813, 7f));
    return _e816;
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
        let _e210 = i_2;
        if !((_e210 < 6i)) {
            break;
        }
        {
            let _e217 = i_2;
            if (_e217 < 2i) {
                local_9 = vec3<f32>(1f, 0f, 0f);
            } else {
                let _e227 = i_2;
                if (_e227 < 4i) {
                    local_8 = vec3<f32>(0f, 1f, 0f);
                } else {
                    local_8 = vec3<f32>(0f, 0f, 1f);
                }
                let _e245 = local_8;
                local_9 = _e245;
            }
            let _e247 = local_9;
            axis = _e247;
            let _e249 = i_2;
            let _e250 = f32(_e249);
            if ((_e250 - (floor((_e250 / 2f)) * 2f)) < 0.5f) {
                local_10 = 1f;
            } else {
                local_10 = -1f;
            }
            let _e262 = local_10;
            side = _e262;
            let _e264 = gradient;
            let _e265 = axis;
            let _e266 = side;
            let _e268 = p_39;
            let _e269 = axis;
            let _e270 = side;
            let _e275 = mapScene((_e268 + (_e269 * (_e270 * 0.0022f))));
            gradient = (_e264 + ((_e265 * _e266) * _e275.x));
        }
        continuing {
            let _e214 = i_2;
            i_2 = (_e214 + 1i);
        }
    }
    let _e279 = gradient;
    return normalize(_e279);
}

fn cubeLocal(p_40: vec3<f32>) -> vec3<f32> {
    var p_41: vec3<f32>;

    p_41 = p_40;
    let _e204 = uniforms;
    let _e207 = -(_e204.uCubeQ.xyz);
    let _e208 = uniforms;
    let _e215 = p_41;
    let _e216 = cubeCenter();
    let _e218 = qrot(vec4<f32>(_e207.x, _e207.y, _e207.z, _e208.uCubeQ.w), (_e215 - _e216));
    return _e218;
}

fn cubeEdge(local_11: vec3<f32>) -> f32 {
    var local_12: vec3<f32>;
    var a_3: vec3<f32>;
    var middle: f32;

    local_12 = local_11;
    let _e204 = local_12;
    a_3 = abs(_e204);
    let _e207 = a_3;
    let _e209 = a_3;
    let _e212 = a_3;
    let _e215 = a_3;
    let _e217 = a_3;
    let _e219 = a_3;
    let _e224 = a_3;
    let _e226 = a_3;
    let _e228 = a_3;
    middle = ((((_e207.x + _e209.y) + _e212.z) - min(_e215.x, min(_e217.y, _e219.z))) - max(_e224.x, max(_e226.y, _e228.z)));
    let _e235 = cubeScale();
    let _e238 = cubeScale();
    let _e240 = middle;
    return smoothstep((0.185f * _e235), (0.232f * _e238), _e240);
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
    let _e212 = mint_1;
    t = _e212;
    loop {
        let _e218 = i_3;
        if !((_e218 < 64i)) {
            break;
        }
        {
            let _e225 = ro_1;
            let _e226 = rd_1;
            let _e227 = t;
            let _e230 = mapScene((_e225 + (_e226 * _e227)));
            sceneSample = _e230;
            let _e232 = sceneSample;
            h_5 = _e232.x;
            let _e235 = h_5;
            if (_e235 < 0.0006f) {
                return 0f;
            }
            let _e239 = h_5;
            let _e240 = h_5;
            let _e243 = previous;
            y = ((_e239 * _e240) / max((2f * _e243), 0.001f));
            let _e249 = h_5;
            let _e250 = h_5;
            let _e252 = y;
            let _e253 = y;
            d_6 = sqrt(max(((_e249 * _e250) - (_e252 * _e253)), 0f));
            let _e260 = sceneSample;
            let _e264 = sceneSample;
            let _e268 = sceneSample;
            if ((_e260.y > 6.5f) && ((_e264.y < 12.5f) || (_e268.y > 13.5f))) {
                let _e274 = visibility;
                let _e276 = d_6;
                let _e278 = t;
                let _e279 = y;
                visibility = min(_e274, ((14f * _e276) / max((_e278 - _e279), 0.015f)));
            }
            let _e285 = h_5;
            previous = _e285;
            let _e286 = t;
            let _e287 = h_5;
            t = (_e286 + clamp((_e287 * 0.85f), 0.012f, 0.24f));
            let _e294 = visibility;
            let _e297 = t;
            let _e298 = maxt_1;
            if ((_e294 < 0.015f) || (_e297 > _e298)) {
                break;
            }
        }
        continuing {
            let _e222 = i_3;
            i_3 = (_e222 + 1i);
        }
    }
    let _e301 = visibility;
    return clamp(_e301, 0f, 1f);
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
        let _e214 = i_4;
        if !((_e214 < 8i)) {
            break;
        }
        {
            let _e223 = i_4;
            h_6 = (0.018f + (0.052f * f32(_e223)));
            let _e228 = p_43;
            let _e229 = n_1;
            let _e230 = h_6;
            let _e233 = mapScene((_e228 + (_e229 * _e230)));
            d_7 = _e233.x;
            let _e236 = occ;
            let _e237 = h_6;
            let _e238 = d_7;
            let _e240 = h_6;
            let _e245 = weight;
            occ = (_e236 + (clamp(((_e237 - _e238) / _e240), 0f, 1f) * _e245));
            let _e248 = total;
            let _e249 = weight;
            total = (_e248 + _e249);
            let _e251 = weight;
            weight = (_e251 * 0.72f);
        }
        continuing {
            let _e218 = i_4;
            i_4 = (_e218 + 1i);
        }
    }
    let _e255 = occ;
    let _e256 = total;
    return clamp((1f - ((_e255 / max(_e256, 0.001f)) * 0.85f)), 0f, 1f);
}

fn targetColor() -> vec3<f32> {
    var local_13: vec3<f32>;
    var local_14: vec3<f32>;
    var local_15: vec3<f32>;

    let _e202 = uniforms;
    if (_e202.uTargetType.x < 1.5f) {
        local_15 = vec3<f32>(0.045f, 0.92f, 0.3f);
    } else {
        let _e211 = uniforms;
        if (_e211.uTargetType.x < 2.5f) {
            local_14 = vec3<f32>(0.055f, 0.32f, 1f);
        } else {
            let _e220 = uniforms;
            if (_e220.uTargetType.x < 3.5f) {
                local_13 = vec3<f32>(1f, 0.56f, 0.055f);
            } else {
                local_13 = vec3<f32>(0.025f, 1f, 0.4f);
            }
            let _e234 = local_13;
            local_14 = _e234;
        }
        let _e236 = local_14;
        local_15 = _e236;
    }
    let _e238 = local_15;
    return _e238;
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
    let _e206 = p_45;
    let _e211 = p_45;
    let _e213 = uniforms;
    if ((_e206.z > -3.09f) || (_e211.y < (_e213.uTargetY.x + 0.12f))) {
        {
            let _e222 = p_45;
            let _e224 = uniforms;
            let _e231 = effectTime();
            wave = (0.5f + (0.5f * sin(((length((_e222.xz - _e224.uTarget.xy)) * 24f) - (_e231 * 1.2f)))));
            let _e245 = wave;
            return (vec3<f32>(0.025f, 1f, 0.4f) * (1.1f + (0.22f * _e245)));
        }
    }
    let _e249 = p_45;
    let _e251 = uniforms;
    let _e256 = uniforms;
    uv = ((_e249.xy - vec2<f32>(_e251.uTarget.x, (0.74f + _e256.uTargetY.x))) / vec2<f32>(0.54f, 0.66f));
    let _e267 = uv;
    let _e270 = uv;
    let _e280 = aaLine((abs((max(abs(_e267.x), abs(_e270.y)) - 0.9f)) * 0.54f), 0.025f);
    rim = _e280;
    loop {
        let _e288 = i_5;
        if !((_e288 < 6i)) {
            break;
        }
        {
            let _e295 = i_5;
            depth = ((f32(_e295) + 0.5f) / 6f);
            let _e303 = uv;
            let _e304 = rd_3;
            let _e306 = rd_3;
            let _e313 = depth;
            q_5 = (_e303 + (((_e304.xy / vec2(max(abs(_e306.z), 0.25f))) * _e313) * 0.16f));
            let _e319 = q_5;
            let _e320 = q_5;
            let _e323 = depth;
            let _e326 = effectTime();
            let _e331 = noise(((_e320 * 2.8f) + vec2<f32>((_e323 * 7f), (_e326 * 0.09f))));
            let _e334 = q_5;
            let _e338 = depth;
            let _e343 = noise(((_e334 * 2.8f) + vec2<f32>(8f, (_e338 * 5f))));
            q_5 = (_e319 + (vec2<f32>((_e331 - 0.5f), (_e343 - 0.5f)) * 0.09f));
            let _e350 = q_5;
            radius_1 = length(_e350);
            let _e353 = q_5;
            let _e357 = q_5;
            angle = atan2((_e353.y + 0.0001f), (_e357.x + 0.0001f));
            let _e365 = radius_1;
            let _e368 = angle;
            let _e372 = depth;
            let _e376 = effectTime();
            swirl = pow((0.5f + (0.5f * sin(((((_e365 * 18f) - (_e368 * 2f)) + (_e372 * 2.4f)) - (_e376 * 0.9f))))), 3f);
            let _e388 = swirl;
            let _e394 = radius_1;
            density = ((0.1f + (1.8f * _e388)) * (1f - smoothstep(0.35f, 1.05f, _e394)));
            let _e399 = density;
            extinction = exp(((-(_e399) * 2f) / 6f));
            let _e408 = energy;
            let _e409 = transmission;
            let _e411 = extinction;
            energy = (_e408 + (_e409 * (1f - _e411)));
            let _e415 = transmission;
            let _e416 = extinction;
            transmission = (_e415 * _e416);
        }
        continuing {
            let _e292 = i_5;
            i_5 = (_e292 + 1i);
        }
    }
    let _e423 = energy;
    let _e432 = rim;
    return ((vec3<f32>(0.025f, 0.85f, 0.34f) * (0.1f + (_e423 * 1.85f))) + ((vec3<f32>(0.08f, 1.3f, 0.66f) * _e432) * 0.75f));
}

fn stripeIntegral(x: f32, duty: f32) -> f32 {
    var x_1: f32;
    var duty_1: f32;

    x_1 = x;
    duty_1 = duty;
    let _e206 = x_1;
    let _e208 = duty_1;
    let _e210 = x_1;
    let _e212 = duty_1;
    return ((floor(_e206) * _e208) + min(fract(_e210), _e212));
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
    let _e210 = width_1;
    let _e211 = period_1;
    duty_2 = clamp((_e210 / _e211), 0f, 1f);
    let _e217 = footprint_1;
    let _e218 = period_1;
    span_1 = max((_e217 / _e218), 0.002f);
    let _e223 = span_1;
    if (_e223 >= 1f) {
        let _e226 = duty_2;
        return _e226;
    }
    let _e227 = coordinate_1;
    let _e228 = period_1;
    let _e230 = duty_2;
    x_2 = ((_e227 / _e228) + (_e230 * 0.5f));
    let _e235 = x_2;
    let _e236 = span_1;
    let _e240 = duty_2;
    let _e241 = stripeIntegral((_e235 + (_e236 * 0.5f)), _e240);
    let _e242 = x_2;
    let _e243 = span_1;
    let _e247 = duty_2;
    let _e248 = stripeIntegral((_e242 - (_e243 * 0.5f)), _e247);
    let _e250 = span_1;
    return clamp(((_e241 - _e248) / _e250), 0f, 1f);
}

fn filteredStripe(coordinate_2: f32, period_2: f32, width_2: f32) -> f32 {
    var coordinate_3: f32;
    var period_3: f32;
    var width_3: f32;

    coordinate_3 = coordinate_2;
    period_3 = period_2;
    width_3 = width_2;
    let _e208 = coordinate_3;
    let _e209 = period_3;
    let _e210 = width_3;
    let _e211 = gFootprint;
    let _e212 = stripeCoverage(_e208, _e209, _e210, _e211);
    return _e212;
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
    let _e206 = p_47;
    i_6 = floor(_e206);
    let _e209 = p_47;
    f_1 = fract(_e209);
    let _e212 = f_1;
    let _e213 = f_1;
    let _e215 = f_1;
    let _e217 = f_1;
    let _e218 = f_1;
    u_1 = (((_e212 * _e213) * _e215) * ((_e217 * ((_e218 * 6f) - vec2(15f))) + vec2(10f)));
    let _e231 = f_1;
    let _e233 = f_1;
    let _e235 = f_1;
    let _e240 = f_1;
    du = ((((30f * _e231) * _e233) * (_e235 - vec2(1f))) * (_e240 - vec2(1f)));
    let _e246 = i_6;
    let _e247 = hash(_e246);
    a_4 = _e247;
    let _e249 = i_6;
    let _e256 = hash((_e249 + vec2<f32>(1f, 0f)));
    b_8 = _e256;
    let _e258 = i_6;
    let _e265 = hash((_e258 + vec2<f32>(0f, 1f)));
    c = _e265;
    let _e267 = i_6;
    let _e274 = hash((_e267 + vec2<f32>(1f, 1f)));
    d_8 = _e274;
    let _e276 = frequency_7;
    let _e277 = detailWeight(_e276);
    w_2 = _e277;
    let _e280 = a_4;
    let _e281 = b_8;
    let _e282 = u_1;
    let _e285 = c;
    let _e286 = d_8;
    let _e287 = u_1;
    let _e290 = u_1;
    let _e295 = w_2;
    let _e298 = du;
    let _e300 = b_8;
    let _e301 = a_4;
    let _e303 = d_8;
    let _e304 = c;
    let _e306 = u_1;
    let _e310 = w_2;
    let _e312 = du;
    let _e314 = c;
    let _e315 = a_4;
    let _e317 = d_8;
    let _e318 = b_8;
    let _e320 = u_1;
    let _e324 = w_2;
    return vec3<f32>((0.5f + ((mix(mix(_e280, _e281, _e282.x), mix(_e285, _e286, _e287.x), _e290.y) - 0.5f) * _e295)), ((_e298.x * mix((_e300 - _e301), (_e303 - _e304), _e306.y)) * _e310), ((_e312.y * mix((_e314 - _e315), (_e317 - _e318), _e320.x)) * _e324));
}

fn faceUV(p_48: vec3<f32>, n_2: vec3<f32>) -> vec2<f32> {
    var p_49: vec3<f32>;
    var n_3: vec3<f32>;
    var a_5: vec3<f32>;
    var local_16: vec2<f32>;
    var local_17: vec2<f32>;

    p_49 = p_48;
    n_3 = n_2;
    let _e206 = n_3;
    a_5 = abs(_e206);
    let _e209 = a_5;
    let _e211 = a_5;
    let _e213 = a_5;
    if (_e209.y >= max(_e211.x, _e213.z)) {
        let _e217 = p_49;
        local_17 = _e217.xz;
    } else {
        let _e219 = a_5;
        let _e221 = a_5;
        if (_e219.x >= _e221.z) {
            let _e224 = p_49;
            local_16 = _e224.zy;
        } else {
            let _e226 = p_49;
            local_16 = _e226.xy;
        }
        let _e229 = local_16;
        local_17 = _e229;
    }
    let _e231 = local_17;
    return _e231;
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
    let _e212 = frequency_9;
    let _e214 = frequency_9;
    f_2 = max(_e212.x, _e214.y);
    let _e218 = f_2;
    let _e219 = detailWeight(_e218);
    w_3 = _e219;
    let _e221 = uv_2;
    let _e222 = frequency_9;
    let _e224 = f_2;
    let _e225 = materialNoise((_e221 * _e222), _e224);
    let _e227 = strength_1;
    let _e228 = (_e225.yz * _e227);
    let _e229 = strength_1;
    let _e230 = strength_1;
    let _e233 = w_3;
    let _e234 = w_3;
    r_11 = vec3<f32>(_e228.x, _e228.y, ((_e229 * _e230) * (1f - (_e233 * _e234))));
    let _e241 = f_2;
    f_2 = (_e241 * 2.07f);
    let _e244 = f_2;
    let _e245 = detailWeight(_e244);
    w_3 = _e245;
    let _e246 = r_11;
    let _e247 = uv_2;
    let _e248 = frequency_9;
    let _e256 = f_2;
    let _e257 = materialNoise((((_e247 * _e248) * 2.07f) + vec2<f32>(4.7f, 1.3f)), _e256);
    let _e259 = strength_1;
    let _e262 = ((_e257.yz * _e259) * 0.35f);
    let _e263 = strength_1;
    let _e264 = strength_1;
    let _e269 = w_3;
    let _e270 = w_3;
    r_11 = (_e246 + vec3<f32>(_e262.x, _e262.y, (((_e263 * _e264) * 0.1225f) * (1f - (_e269 * _e270)))));
    let _e278 = f_2;
    f_2 = (_e278 * 1.83f);
    let _e281 = f_2;
    let _e282 = detailWeight(_e281);
    w_3 = _e282;
    let _e283 = r_11;
    let _e284 = uv_2;
    let _e285 = frequency_9;
    let _e293 = f_2;
    let _e294 = materialNoise((((_e284 * _e285) * 3.79f) + vec2<f32>(9.1f, 5.2f)), _e293);
    let _e296 = strength_1;
    let _e299 = ((_e294.yz * _e296) * 0.16f);
    let _e300 = strength_1;
    let _e301 = strength_1;
    let _e306 = w_3;
    let _e307 = w_3;
    r_11 = (_e283 + vec3<f32>(_e299.x, _e299.y, (((_e300 * _e301) * 0.0256f) * (1f - (_e306 * _e307)))));
    let _e315 = r_11;
    return _e315;
}

fn edgeMask(p_50: vec3<f32>, extent_2: vec3<f32>) -> f32 {
    var p_51: vec3<f32>;
    var extent_3: vec3<f32>;
    var d_9: vec3<f32>;
    var second: f32;

    p_51 = p_50;
    extent_3 = extent_2;
    let _e206 = p_51;
    let _e208 = extent_3;
    d_9 = (abs(_e206) / max(_e208, vec3(0.03f)));
    let _e214 = d_9;
    let _e216 = d_9;
    let _e219 = d_9;
    let _e222 = d_9;
    let _e224 = d_9;
    let _e226 = d_9;
    let _e231 = d_9;
    let _e233 = d_9;
    let _e235 = d_9;
    second = ((((_e214.x + _e216.y) + _e219.z) - min(_e222.x, min(_e224.y, _e226.z))) - max(_e231.x, max(_e233.y, _e235.z)));
    let _e243 = second;
    return smoothstep(0.78f, 0.98f, _e243);
}

fn zoneSlot(slot: f32, zone: ptr<function, vec4<f32>>, shape_8: ptr<function, vec4<f32>>, basis_8: ptr<function, vec4<f32>>, motion_6: ptr<function, vec4<f32>>) {
    var slot_1: f32;
    var a_6: vec4<f32>;
    var b_9: vec4<f32>;

    slot_1 = slot;
    let _e213 = slot_1;
    a_6 = (vec4(1f) - step(vec4(0.5f), abs((vec4(_e213) - vec4<f32>(0f, 1f, 2f, 3f)))));
    let _e234 = slot_1;
    b_9 = (vec4(1f) - step(vec4(0.5f), abs((vec4(_e234) - vec4<f32>(4f, 5f, 6f, 7f)))));
    let _e250 = uniforms;
    let _e252 = a_6;
    let _e255 = uniforms;
    let _e257 = a_6;
    let _e261 = uniforms;
    let _e263 = a_6;
    let _e267 = uniforms;
    let _e269 = a_6;
    let _e273 = uniforms;
    let _e275 = b_9;
    let _e279 = uniforms;
    let _e281 = b_9;
    let _e285 = uniforms;
    let _e287 = b_9;
    let _e291 = uniforms;
    let _e293 = b_9;
    (*zone) = ((((((((_e250.uZone0_ * _e252.x) + (_e255.uZone1_ * _e257.y)) + (_e261.uZone2_ * _e263.z)) + (_e267.uZone3_ * _e269.w)) + (_e273.uZone4_ * _e275.x)) + (_e279.uZone5_ * _e281.y)) + (_e285.uZone6_ * _e287.z)) + (_e291.uZone7_ * _e293.w));
    let _e297 = uniforms;
    let _e299 = a_6;
    let _e302 = uniforms;
    let _e304 = a_6;
    let _e308 = uniforms;
    let _e310 = a_6;
    let _e314 = uniforms;
    let _e316 = a_6;
    let _e320 = uniforms;
    let _e322 = b_9;
    let _e326 = uniforms;
    let _e328 = b_9;
    let _e332 = uniforms;
    let _e334 = b_9;
    let _e338 = uniforms;
    let _e340 = b_9;
    (*shape_8) = ((((((((_e297.uZoneShape0_ * _e299.x) + (_e302.uZoneShape1_ * _e304.y)) + (_e308.uZoneShape2_ * _e310.z)) + (_e314.uZoneShape3_ * _e316.w)) + (_e320.uZoneShape4_ * _e322.x)) + (_e326.uZoneShape5_ * _e328.y)) + (_e332.uZoneShape6_ * _e334.z)) + (_e338.uZoneShape7_ * _e340.w));
    let _e344 = uniforms;
    let _e346 = a_6;
    let _e349 = uniforms;
    let _e351 = a_6;
    let _e355 = uniforms;
    let _e357 = a_6;
    let _e361 = uniforms;
    let _e363 = a_6;
    let _e367 = uniforms;
    let _e369 = b_9;
    let _e373 = uniforms;
    let _e375 = b_9;
    let _e379 = uniforms;
    let _e381 = b_9;
    let _e385 = uniforms;
    let _e387 = b_9;
    (*basis_8) = ((((((((_e344.uZoneBasis0_ * _e346.x) + (_e349.uZoneBasis1_ * _e351.y)) + (_e355.uZoneBasis2_ * _e357.z)) + (_e361.uZoneBasis3_ * _e363.w)) + (_e367.uZoneBasis4_ * _e369.x)) + (_e373.uZoneBasis5_ * _e375.y)) + (_e379.uZoneBasis6_ * _e381.z)) + (_e385.uZoneBasis7_ * _e387.w));
    let _e391 = uniforms;
    let _e393 = a_6;
    let _e396 = uniforms;
    let _e398 = a_6;
    let _e402 = uniforms;
    let _e404 = a_6;
    let _e408 = uniforms;
    let _e410 = a_6;
    let _e414 = uniforms;
    let _e416 = b_9;
    let _e420 = uniforms;
    let _e422 = b_9;
    let _e426 = uniforms;
    let _e428 = b_9;
    let _e432 = uniforms;
    let _e434 = b_9;
    (*motion_6) = ((((((((_e391.uZoneMotion0_ * _e393.x) + (_e396.uZoneMotion1_ * _e398.y)) + (_e402.uZoneMotion2_ * _e404.z)) + (_e408.uZoneMotion3_ * _e410.w)) + (_e414.uZoneMotion4_ * _e416.x)) + (_e420.uZoneMotion5_ * _e422.y)) + (_e426.uZoneMotion6_ * _e428.z)) + (_e432.uZoneMotion7_ * _e434.w));
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
    let _e209 = gHitMaterial;
    let _e210 = m_1;
    let _e212 = p_53;
    let _e213 = gHitPoint;
    if ((_e209 == _e210) && (distance(_e212, _e213) < 0.0001f)) {
        {
            let _e218 = gHitCoordinates;
            (*q_6) = _e218;
            let _e219 = gHitExtent;
            (*extent_4) = _e219;
            let _e220 = gHitSeed;
            (*seed) = _e220;
            return;
        }
    }
    let _e221 = p_53;
    (*q_6) = _e221;
    (*extent_4) = vec3(1f);
    (*seed) = 0f;
    let _e229 = m_1;
    let _e232 = m_1;
    if ((_e229 > 6.5f) && (_e232 < 7.5f)) {
        {
            let _e236 = p_53;
            let _e237 = cubeLocal(_e236);
            (*q_6) = _e237;
            let _e240 = cubeScale();
            (*extent_4) = (vec3(0.245f) * _e240);
            return;
        }
    }
    let _e242 = m_1;
    let _e245 = m_1;
    if ((_e242 > 7.5f) && (_e245 < 8.5f)) {
        {
            let _e250 = includeCandidate(801f);
            let _e251 = uniforms;
            if (_e250 && (_e251.uObs0_.z > 0.001f)) {
                {
                    let _e257 = p_53;
                    let _e258 = uniforms;
                    let _e260 = obstacle(_e257, _e258.uObs0_);
                    d_10 = abs(_e260.x);
                    let _e263 = d_10;
                    let _e264 = best;
                    if (_e263 < _e264) {
                        {
                            let _e266 = d_10;
                            best = _e266;
                            let _e267 = p_53;
                            let _e268 = uniforms;
                            let _e272 = uniforms;
                            (*q_6) = (_e267 - vec3<f32>(_e268.uObs0_.x, 0.245f, _e272.uObs0_.y));
                            let _e277 = uniforms;
                            let _e283 = uniforms;
                            (*extent_4) = vec3<f32>((_e277.uObs0_.z * 0.5f), 0.245f, (_e283.uObs0_.w * 0.5f));
                            (*seed) = 1f;
                        }
                    }
                }
            }
            let _e291 = includeCandidate(802f);
            let _e292 = uniforms;
            if (_e291 && (_e292.uObs1_.z > 0.001f)) {
                {
                    let _e298 = p_53;
                    let _e299 = uniforms;
                    let _e301 = obstacle(_e298, _e299.uObs1_);
                    d_10 = abs(_e301.x);
                    let _e304 = d_10;
                    let _e305 = best;
                    if (_e304 < _e305) {
                        {
                            let _e307 = d_10;
                            best = _e307;
                            let _e308 = p_53;
                            let _e309 = uniforms;
                            let _e313 = uniforms;
                            (*q_6) = (_e308 - vec3<f32>(_e309.uObs1_.x, 0.245f, _e313.uObs1_.y));
                            let _e318 = uniforms;
                            let _e324 = uniforms;
                            (*extent_4) = vec3<f32>((_e318.uObs1_.z * 0.5f), 0.245f, (_e324.uObs1_.w * 0.5f));
                            (*seed) = 2f;
                        }
                    }
                }
            }
            let _e332 = includeCandidate(803f);
            let _e333 = uniforms;
            if (_e332 && (_e333.uObs2_.z > 0.001f)) {
                {
                    let _e339 = p_53;
                    let _e340 = uniforms;
                    let _e342 = obstacle(_e339, _e340.uObs2_);
                    d_10 = abs(_e342.x);
                    let _e345 = d_10;
                    let _e346 = best;
                    if (_e345 < _e346) {
                        {
                            let _e348 = d_10;
                            best = _e348;
                            let _e349 = p_53;
                            let _e350 = uniforms;
                            let _e354 = uniforms;
                            (*q_6) = (_e349 - vec3<f32>(_e350.uObs2_.x, 0.245f, _e354.uObs2_.y));
                            let _e359 = uniforms;
                            let _e365 = uniforms;
                            (*extent_4) = vec3<f32>((_e359.uObs2_.z * 0.5f), 0.245f, (_e365.uObs2_.w * 0.5f));
                            (*seed) = 3f;
                        }
                    }
                }
            }
            let _e373 = includeCandidate(804f);
            let _e374 = uniforms;
            if (_e373 && (_e374.uObs3_.z > 0.001f)) {
                {
                    let _e380 = p_53;
                    let _e381 = uniforms;
                    let _e383 = obstacle(_e380, _e381.uObs3_);
                    d_10 = abs(_e383.x);
                    let _e386 = d_10;
                    let _e387 = best;
                    if (_e386 < _e387) {
                        {
                            let _e389 = d_10;
                            best = _e389;
                            let _e390 = p_53;
                            let _e391 = uniforms;
                            let _e395 = uniforms;
                            (*q_6) = (_e390 - vec3<f32>(_e391.uObs3_.x, 0.245f, _e395.uObs3_.y));
                            let _e400 = uniforms;
                            let _e406 = uniforms;
                            (*extent_4) = vec3<f32>((_e400.uObs3_.z * 0.5f), 0.245f, (_e406.uObs3_.w * 0.5f));
                            (*seed) = 4f;
                        }
                    }
                }
            }
            let _e414 = includeCandidate(805f);
            let _e415 = uniforms;
            if (_e414 && (_e415.uObs4_.z > 0.001f)) {
                {
                    let _e421 = p_53;
                    let _e422 = uniforms;
                    let _e424 = obstacle(_e421, _e422.uObs4_);
                    d_10 = abs(_e424.x);
                    let _e427 = d_10;
                    let _e428 = best;
                    if (_e427 < _e428) {
                        {
                            let _e430 = d_10;
                            best = _e430;
                            let _e431 = p_53;
                            let _e432 = uniforms;
                            let _e436 = uniforms;
                            (*q_6) = (_e431 - vec3<f32>(_e432.uObs4_.x, 0.245f, _e436.uObs4_.y));
                            let _e441 = uniforms;
                            let _e447 = uniforms;
                            (*extent_4) = vec3<f32>((_e441.uObs4_.z * 0.5f), 0.245f, (_e447.uObs4_.w * 0.5f));
                            (*seed) = 5f;
                        }
                    }
                }
            }
            let _e455 = includeCandidate(806f);
            let _e456 = uniforms;
            if (_e455 && (_e456.uObs5_.z > 0.001f)) {
                {
                    let _e462 = p_53;
                    let _e463 = uniforms;
                    let _e465 = obstacle(_e462, _e463.uObs5_);
                    d_10 = abs(_e465.x);
                    let _e468 = d_10;
                    let _e469 = best;
                    if (_e468 < _e469) {
                        {
                            let _e471 = d_10;
                            best = _e471;
                            let _e472 = p_53;
                            let _e473 = uniforms;
                            let _e477 = uniforms;
                            (*q_6) = (_e472 - vec3<f32>(_e473.uObs5_.x, 0.245f, _e477.uObs5_.y));
                            let _e482 = uniforms;
                            let _e488 = uniforms;
                            (*extent_4) = vec3<f32>((_e482.uObs5_.z * 0.5f), 0.245f, (_e488.uObs5_.w * 0.5f));
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
        let _e495 = m_1;
        let _e498 = m_1;
        if ((_e495 > 18.5f) && (_e498 < 19.5f)) {
            {
                let _e503 = includeCandidate(1911f);
                let _e504 = uniforms;
                if (_e503 && (_e504.uPlat0_.z > 0.001f)) {
                    {
                        let _e510 = p_53;
                        let _e511 = uniforms;
                        let _e513 = uniforms;
                        let _e515 = platformObj(_e510, _e511.uPlat0_, _e513.uPlatMeta0_);
                        d_10 = abs(_e515.x);
                        let _e518 = d_10;
                        let _e519 = best;
                        if (_e518 < _e519) {
                            {
                                let _e521 = d_10;
                                best = _e521;
                                let _e522 = p_53;
                                let _e523 = uniforms;
                                let _e526 = uniforms;
                                let _e531 = uniforms;
                                (*q_6) = (_e522 - vec3<f32>(_e523.uPlat0_.x, (_e526.uPlatMeta0_.x * 0.5f), _e531.uPlat0_.y));
                                let _e536 = uniforms;
                                let _e541 = uniforms;
                                let _e546 = uniforms;
                                (*extent_4) = vec3<f32>((_e536.uPlat0_.z * 0.5f), (_e541.uPlatMeta0_.x * 0.5f), (_e546.uPlat0_.w * 0.5f));
                                (*seed) = 11f;
                            }
                        }
                    }
                }
                let _e554 = includeCandidate(1912f);
                let _e555 = uniforms;
                if (_e554 && (_e555.uPlat1_.z > 0.001f)) {
                    {
                        let _e561 = p_53;
                        let _e562 = uniforms;
                        let _e564 = uniforms;
                        let _e566 = platformObj(_e561, _e562.uPlat1_, _e564.uPlatMeta1_);
                        d_10 = abs(_e566.x);
                        let _e569 = d_10;
                        let _e570 = best;
                        if (_e569 < _e570) {
                            {
                                let _e572 = d_10;
                                best = _e572;
                                let _e573 = p_53;
                                let _e574 = uniforms;
                                let _e577 = uniforms;
                                let _e582 = uniforms;
                                (*q_6) = (_e573 - vec3<f32>(_e574.uPlat1_.x, (_e577.uPlatMeta1_.x * 0.5f), _e582.uPlat1_.y));
                                let _e587 = uniforms;
                                let _e592 = uniforms;
                                let _e597 = uniforms;
                                (*extent_4) = vec3<f32>((_e587.uPlat1_.z * 0.5f), (_e592.uPlatMeta1_.x * 0.5f), (_e597.uPlat1_.w * 0.5f));
                                (*seed) = 12f;
                            }
                        }
                    }
                }
                let _e605 = includeCandidate(1913f);
                let _e606 = uniforms;
                if (_e605 && (_e606.uPlat2_.z > 0.001f)) {
                    {
                        let _e612 = p_53;
                        let _e613 = uniforms;
                        let _e615 = uniforms;
                        let _e617 = platformObj(_e612, _e613.uPlat2_, _e615.uPlatMeta2_);
                        d_10 = abs(_e617.x);
                        let _e620 = d_10;
                        let _e621 = best;
                        if (_e620 < _e621) {
                            {
                                let _e623 = d_10;
                                best = _e623;
                                let _e624 = p_53;
                                let _e625 = uniforms;
                                let _e628 = uniforms;
                                let _e633 = uniforms;
                                (*q_6) = (_e624 - vec3<f32>(_e625.uPlat2_.x, (_e628.uPlatMeta2_.x * 0.5f), _e633.uPlat2_.y));
                                let _e638 = uniforms;
                                let _e643 = uniforms;
                                let _e648 = uniforms;
                                (*extent_4) = vec3<f32>((_e638.uPlat2_.z * 0.5f), (_e643.uPlatMeta2_.x * 0.5f), (_e648.uPlat2_.w * 0.5f));
                                (*seed) = 13f;
                            }
                        }
                    }
                }
                let _e656 = includeCandidate(1914f);
                let _e657 = uniforms;
                if (_e656 && (_e657.uPlat3_.z > 0.001f)) {
                    {
                        let _e663 = p_53;
                        let _e664 = uniforms;
                        let _e666 = uniforms;
                        let _e668 = platformObj(_e663, _e664.uPlat3_, _e666.uPlatMeta3_);
                        d_10 = abs(_e668.x);
                        let _e671 = d_10;
                        let _e672 = best;
                        if (_e671 < _e672) {
                            {
                                let _e674 = d_10;
                                best = _e674;
                                let _e675 = p_53;
                                let _e676 = uniforms;
                                let _e679 = uniforms;
                                let _e684 = uniforms;
                                (*q_6) = (_e675 - vec3<f32>(_e676.uPlat3_.x, (_e679.uPlatMeta3_.x * 0.5f), _e684.uPlat3_.y));
                                let _e689 = uniforms;
                                let _e694 = uniforms;
                                let _e699 = uniforms;
                                (*extent_4) = vec3<f32>((_e689.uPlat3_.z * 0.5f), (_e694.uPlatMeta3_.x * 0.5f), (_e699.uPlat3_.w * 0.5f));
                                (*seed) = 14f;
                            }
                        }
                    }
                }
                let _e707 = includeCandidate(1921f);
                let _e708 = uniforms;
                if (_e707 && (_e708.uRamp0_.z > 0.001f)) {
                    {
                        let _e714 = p_53;
                        let _e715 = uniforms;
                        let _e717 = uniforms;
                        let _e719 = rampObj(_e714, _e715.uRamp0_, _e717.uRampMeta0_);
                        d_10 = abs(_e719.x);
                        let _e722 = d_10;
                        let _e723 = best;
                        if (_e722 < _e723) {
                            {
                                let _e725 = d_10;
                                best = _e725;
                                let _e726 = p_53;
                                let _e727 = uniforms;
                                let _e730 = uniforms;
                                let _e733 = uniforms;
                                let _e739 = uniforms;
                                (*q_6) = (_e726 - vec3<f32>(_e727.uRamp0_.x, ((_e730.uRampMeta0_.x + _e733.uRampMeta0_.w) * 0.5f), _e739.uRamp0_.y));
                                let _e744 = uniforms;
                                let _e749 = uniforms;
                                let _e752 = uniforms;
                                let _e758 = uniforms;
                                (*extent_4) = vec3<f32>((_e744.uRamp0_.z * 0.5f), ((_e749.uRampMeta0_.x - _e752.uRampMeta0_.w) * 0.5f), (_e758.uRamp0_.w * 0.5f));
                                (*seed) = 21f;
                            }
                        }
                    }
                }
                let _e766 = includeCandidate(1922f);
                let _e767 = uniforms;
                if (_e766 && (_e767.uRamp1_.z > 0.001f)) {
                    {
                        let _e773 = p_53;
                        let _e774 = uniforms;
                        let _e776 = uniforms;
                        let _e778 = rampObj(_e773, _e774.uRamp1_, _e776.uRampMeta1_);
                        d_10 = abs(_e778.x);
                        let _e781 = d_10;
                        let _e782 = best;
                        if (_e781 < _e782) {
                            {
                                let _e784 = d_10;
                                best = _e784;
                                let _e785 = p_53;
                                let _e786 = uniforms;
                                let _e789 = uniforms;
                                let _e792 = uniforms;
                                let _e798 = uniforms;
                                (*q_6) = (_e785 - vec3<f32>(_e786.uRamp1_.x, ((_e789.uRampMeta1_.x + _e792.uRampMeta1_.w) * 0.5f), _e798.uRamp1_.y));
                                let _e803 = uniforms;
                                let _e808 = uniforms;
                                let _e811 = uniforms;
                                let _e817 = uniforms;
                                (*extent_4) = vec3<f32>((_e803.uRamp1_.z * 0.5f), ((_e808.uRampMeta1_.x - _e811.uRampMeta1_.w) * 0.5f), (_e817.uRamp1_.w * 0.5f));
                                (*seed) = 22f;
                            }
                        }
                    }
                }
                let _e825 = includeCandidate(1923f);
                let _e826 = uniforms;
                if (_e825 && (_e826.uRamp2_.z > 0.001f)) {
                    {
                        let _e832 = p_53;
                        let _e833 = uniforms;
                        let _e835 = uniforms;
                        let _e837 = rampObj(_e832, _e833.uRamp2_, _e835.uRampMeta2_);
                        d_10 = abs(_e837.x);
                        let _e840 = d_10;
                        let _e841 = best;
                        if (_e840 < _e841) {
                            {
                                let _e843 = d_10;
                                best = _e843;
                                let _e844 = p_53;
                                let _e845 = uniforms;
                                let _e848 = uniforms;
                                let _e851 = uniforms;
                                let _e857 = uniforms;
                                (*q_6) = (_e844 - vec3<f32>(_e845.uRamp2_.x, ((_e848.uRampMeta2_.x + _e851.uRampMeta2_.w) * 0.5f), _e857.uRamp2_.y));
                                let _e862 = uniforms;
                                let _e867 = uniforms;
                                let _e870 = uniforms;
                                let _e876 = uniforms;
                                (*extent_4) = vec3<f32>((_e862.uRamp2_.z * 0.5f), ((_e867.uRampMeta2_.x - _e870.uRampMeta2_.w) * 0.5f), (_e876.uRamp2_.w * 0.5f));
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
            let _e883 = m_1;
            let _e886 = m_1;
            let _e890 = m_1;
            let _e893 = m_1;
            if (((_e883 > 15.5f) && (_e886 < 18.5f)) || ((_e890 > 19.5f) && (_e893 < 20.5f))) {
                {
                    loop {
                        let _e900 = i_7;
                        if !((_e900 < 8i)) {
                            break;
                        }
                        {
                            let _e907 = i_7;
                            slot_2 = f32(_e907);
                            let _e911 = slot_2;
                            instance = (31f + _e911);
                            let _e918 = slot_2;
                            zoneSlot(_e918, (&zone_1), (&shape_9), (&basis_9), (&motion_7));
                            let _e928 = zone_1;
                            let _e933 = instance;
                            let _e935 = includeCandidate((((15f + _e928.w) * 100f) + _e933));
                            let _e936 = zone_1;
                            let _e942 = zone_1;
                            let _e945 = m_1;
                            if ((_e935 && (_e936.w > 0.5f)) && (abs(((15f + _e942.w) - _e945)) < 0.25f)) {
                                {
                                    let _e951 = p_53;
                                    let _e952 = zone_1;
                                    let _e953 = shape_9;
                                    let _e954 = basis_9;
                                    let _e955 = motion_7;
                                    let _e956 = zoneObj(_e951, _e952, _e953, _e954, _e955);
                                    d_10 = abs(_e956.x);
                                    let _e959 = d_10;
                                    let _e960 = best;
                                    if (_e959 < _e960) {
                                        {
                                            let _e962 = d_10;
                                            best = _e962;
                                            let _e963 = p_53;
                                            let _e964 = zone_1;
                                            let _e967 = motion_7;
                                            let _e968 = zone_1;
                                            let _e970 = zoneBase(_e967, _e968.w);
                                            let _e972 = zone_1;
                                            (*q_6) = (_e963 - vec3<f32>(_e964.x, (0.016f + _e970), _e972.y));
                                            let _e976 = zone_1;
                                            let _e977 = shape_9;
                                            let _e978 = zoneDimensions(_e976, _e977);
                                            size_1 = _e978;
                                            let _e980 = size_1;
                                            let _e983 = size_1;
                                            (*extent_4) = vec3<f32>(_e980.x, 0.012f, _e983.y);
                                            let _e986 = instance;
                                            (*seed) = _e986;
                                        }
                                    }
                                }
                            }
                        }
                        continuing {
                            let _e904 = i_7;
                            i_7 = (_e904 + 1i);
                        }
                    }
                    return;
                }
            } else {
                let _e987 = m_1;
                if (_e987 > 21.5f) {
                    {
                        let _e991 = includeCandidate(2241f);
                        let _e992 = uniforms;
                        if (_e991 && (_e992.uBump0_.z > 0.01f)) {
                            {
                                let _e998 = p_53;
                                let _e999 = uniforms;
                                let _e1001 = uniforms;
                                let _e1003 = uniforms;
                                let _e1005 = bumperObj(_e998, _e999.uBump0_, _e1001.uBumpFx0_, _e1003.uBumpWarp0_);
                                d_10 = abs(_e1005.x);
                                let _e1008 = d_10;
                                let _e1009 = best;
                                if (_e1008 < _e1009) {
                                    {
                                        let _e1011 = d_10;
                                        best = _e1011;
                                        let _e1012 = uniforms;
                                        h_7 = max(_e1012.uBump0_.w, 0.34f);
                                        let _e1018 = p_53;
                                        let _e1019 = uniforms;
                                        let _e1022 = h_7;
                                        let _e1025 = uniforms;
                                        (*q_6) = (_e1018 - vec3<f32>(_e1019.uBump0_.x, (_e1022 * 0.5f), _e1025.uBump0_.y));
                                        let _e1030 = uniforms;
                                        let _e1033 = h_7;
                                        let _e1036 = uniforms;
                                        (*extent_4) = vec3<f32>(_e1030.uBump0_.z, (_e1033 * 0.5f), _e1036.uBump0_.z);
                                        (*seed) = 41f;
                                    }
                                }
                            }
                        }
                        let _e1042 = includeCandidate(2242f);
                        let _e1043 = uniforms;
                        if (_e1042 && (_e1043.uBump1_.z > 0.01f)) {
                            {
                                let _e1049 = p_53;
                                let _e1050 = uniforms;
                                let _e1052 = uniforms;
                                let _e1054 = uniforms;
                                let _e1056 = bumperObj(_e1049, _e1050.uBump1_, _e1052.uBumpFx1_, _e1054.uBumpWarp1_);
                                d_10 = abs(_e1056.x);
                                let _e1059 = d_10;
                                let _e1060 = best;
                                if (_e1059 < _e1060) {
                                    {
                                        let _e1062 = d_10;
                                        best = _e1062;
                                        let _e1063 = uniforms;
                                        h_8 = max(_e1063.uBump1_.w, 0.34f);
                                        let _e1069 = p_53;
                                        let _e1070 = uniforms;
                                        let _e1073 = h_8;
                                        let _e1076 = uniforms;
                                        (*q_6) = (_e1069 - vec3<f32>(_e1070.uBump1_.x, (_e1073 * 0.5f), _e1076.uBump1_.y));
                                        let _e1081 = uniforms;
                                        let _e1084 = h_8;
                                        let _e1087 = uniforms;
                                        (*extent_4) = vec3<f32>(_e1081.uBump1_.z, (_e1084 * 0.5f), _e1087.uBump1_.z);
                                        (*seed) = 42f;
                                    }
                                }
                            }
                        }
                        let _e1093 = includeCandidate(2243f);
                        let _e1094 = uniforms;
                        if (_e1093 && (_e1094.uBump2_.z > 0.01f)) {
                            {
                                let _e1100 = p_53;
                                let _e1101 = uniforms;
                                let _e1103 = uniforms;
                                let _e1105 = uniforms;
                                let _e1107 = bumperObj(_e1100, _e1101.uBump2_, _e1103.uBumpFx2_, _e1105.uBumpWarp2_);
                                d_10 = abs(_e1107.x);
                                let _e1110 = d_10;
                                let _e1111 = best;
                                if (_e1110 < _e1111) {
                                    {
                                        let _e1113 = d_10;
                                        best = _e1113;
                                        let _e1114 = uniforms;
                                        h_9 = max(_e1114.uBump2_.w, 0.34f);
                                        let _e1120 = p_53;
                                        let _e1121 = uniforms;
                                        let _e1124 = h_9;
                                        let _e1127 = uniforms;
                                        (*q_6) = (_e1120 - vec3<f32>(_e1121.uBump2_.x, (_e1124 * 0.5f), _e1127.uBump2_.y));
                                        let _e1132 = uniforms;
                                        let _e1135 = h_9;
                                        let _e1138 = uniforms;
                                        (*extent_4) = vec3<f32>(_e1132.uBump2_.z, (_e1135 * 0.5f), _e1138.uBump2_.z);
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
                    let _e1143 = m_1;
                    let _e1146 = m_1;
                    if ((_e1143 > 9.5f) && (_e1146 < 12.5f)) {
                        {
                            let _e1150 = p_53;
                            let _e1151 = uniforms;
                            let _e1156 = uniforms;
                            let _e1160 = uniforms;
                            (*q_6) = (_e1150 - vec3<f32>(_e1151.uTarget.x, (0.035f + _e1156.uTargetY.x), _e1160.uTarget.y));
                            (*extent_4) = vec3<f32>(0.49f, 0.02f, 0.49f);
                            return;
                        }
                    } else {
                        let _e1170 = m_1;
                        let _e1173 = m_1;
                        if ((_e1170 > 14.5f) && (_e1173 < 15.5f)) {
                            {
                                let _e1177 = p_53;
                                if (_e1177.z < -3.09f) {
                                    {
                                        let _e1182 = p_53;
                                        let _e1183 = uniforms;
                                        let _e1188 = uniforms;
                                        (*q_6) = (_e1182 - vec3<f32>(_e1183.uTarget.x, (0.74f + _e1188.uTargetY.x), -3.185f));
                                        (*extent_4) = vec3<f32>(0.58f, 0.7f, 0.03f);
                                        return;
                                    }
                                } else {
                                    {
                                        let _e1200 = p_53;
                                        let _e1201 = uniforms;
                                        let _e1206 = uniforms;
                                        let _e1210 = uniforms;
                                        (*q_6) = (_e1200 - vec3<f32>(_e1201.uTarget.x, (0.03f + _e1206.uTargetY.x), _e1210.uTarget.y));
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
    let _e204 = uniforms;
    let _e208 = seed_2;
    let _e215 = uniforms;
    let _e219 = seed_2;
    let _e227 = uniforms;
    let _e231 = seed_2;
    let _e239 = uniforms;
    let _e243 = seed_2;
    let _e251 = uniforms;
    let _e255 = seed_2;
    let _e263 = uniforms;
    let _e267 = seed_2;
    let _e275 = uniforms;
    let _e279 = seed_2;
    let _e287 = uniforms;
    let _e291 = seed_2;
    return ((((((((_e204.uZoneFlow0_ * (1f - step(0.5f, abs((_e208 - 31f))))) + (_e215.uZoneFlow1_ * (1f - step(0.5f, abs((_e219 - 32f)))))) + (_e227.uZoneFlow2_ * (1f - step(0.5f, abs((_e231 - 33f)))))) + (_e239.uZoneFlow3_ * (1f - step(0.5f, abs((_e243 - 34f)))))) + (_e251.uZoneFlow4_ * (1f - step(0.5f, abs((_e255 - 35f)))))) + (_e263.uZoneFlow5_ * (1f - step(0.5f, abs((_e267 - 36f)))))) + (_e275.uZoneFlow6_ * (1f - step(0.5f, abs((_e279 - 37f)))))) + (_e287.uZoneFlow7_ * (1f - step(0.5f, abs((_e291 - 38f))))));
}

fn zoneShapeAt(seed_3: f32) -> vec4<f32> {
    var seed_4: f32;

    seed_4 = seed_3;
    let _e204 = uniforms;
    let _e208 = seed_4;
    let _e215 = uniforms;
    let _e219 = seed_4;
    let _e227 = uniforms;
    let _e231 = seed_4;
    let _e239 = uniforms;
    let _e243 = seed_4;
    let _e251 = uniforms;
    let _e255 = seed_4;
    let _e263 = uniforms;
    let _e267 = seed_4;
    let _e275 = uniforms;
    let _e279 = seed_4;
    let _e287 = uniforms;
    let _e291 = seed_4;
    return ((((((((_e204.uZoneShape0_ * (1f - step(0.5f, abs((_e208 - 31f))))) + (_e215.uZoneShape1_ * (1f - step(0.5f, abs((_e219 - 32f)))))) + (_e227.uZoneShape2_ * (1f - step(0.5f, abs((_e231 - 33f)))))) + (_e239.uZoneShape3_ * (1f - step(0.5f, abs((_e243 - 34f)))))) + (_e251.uZoneShape4_ * (1f - step(0.5f, abs((_e255 - 35f)))))) + (_e263.uZoneShape5_ * (1f - step(0.5f, abs((_e267 - 36f)))))) + (_e275.uZoneShape6_ * (1f - step(0.5f, abs((_e279 - 37f)))))) + (_e287.uZoneShape7_ * (1f - step(0.5f, abs((_e291 - 38f))))));
}

fn zoneBasisAt(seed_5: f32) -> vec4<f32> {
    var seed_6: f32;

    seed_6 = seed_5;
    let _e204 = uniforms;
    let _e208 = seed_6;
    let _e215 = uniforms;
    let _e219 = seed_6;
    let _e227 = uniforms;
    let _e231 = seed_6;
    let _e239 = uniforms;
    let _e243 = seed_6;
    let _e251 = uniforms;
    let _e255 = seed_6;
    let _e263 = uniforms;
    let _e267 = seed_6;
    let _e275 = uniforms;
    let _e279 = seed_6;
    let _e287 = uniforms;
    let _e291 = seed_6;
    return ((((((((_e204.uZoneBasis0_ * (1f - step(0.5f, abs((_e208 - 31f))))) + (_e215.uZoneBasis1_ * (1f - step(0.5f, abs((_e219 - 32f)))))) + (_e227.uZoneBasis2_ * (1f - step(0.5f, abs((_e231 - 33f)))))) + (_e239.uZoneBasis3_ * (1f - step(0.5f, abs((_e243 - 34f)))))) + (_e251.uZoneBasis4_ * (1f - step(0.5f, abs((_e255 - 35f)))))) + (_e263.uZoneBasis5_ * (1f - step(0.5f, abs((_e267 - 36f)))))) + (_e275.uZoneBasis6_ * (1f - step(0.5f, abs((_e279 - 37f)))))) + (_e287.uZoneBasis7_ * (1f - step(0.5f, abs((_e291 - 38f))))));
}

fn zoneMotionAt(seed_7: f32) -> vec4<f32> {
    var seed_8: f32;

    seed_8 = seed_7;
    let _e204 = uniforms;
    let _e208 = seed_8;
    let _e215 = uniforms;
    let _e219 = seed_8;
    let _e227 = uniforms;
    let _e231 = seed_8;
    let _e239 = uniforms;
    let _e243 = seed_8;
    let _e251 = uniforms;
    let _e255 = seed_8;
    let _e263 = uniforms;
    let _e267 = seed_8;
    let _e275 = uniforms;
    let _e279 = seed_8;
    let _e287 = uniforms;
    let _e291 = seed_8;
    return ((((((((_e204.uZoneMotion0_ * (1f - step(0.5f, abs((_e208 - 31f))))) + (_e215.uZoneMotion1_ * (1f - step(0.5f, abs((_e219 - 32f)))))) + (_e227.uZoneMotion2_ * (1f - step(0.5f, abs((_e231 - 33f)))))) + (_e239.uZoneMotion3_ * (1f - step(0.5f, abs((_e243 - 34f)))))) + (_e251.uZoneMotion4_ * (1f - step(0.5f, abs((_e255 - 35f)))))) + (_e263.uZoneMotion5_ * (1f - step(0.5f, abs((_e267 - 36f)))))) + (_e275.uZoneMotion6_ * (1f - step(0.5f, abs((_e279 - 37f)))))) + (_e287.uZoneMotion7_ * (1f - step(0.5f, abs((_e291 - 38f))))));
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
    let _e208 = seed_10;
    let _e209 = zoneShapeAt(_e208);
    authored = _e209;
    let _e213 = extent_6;
    let _e220 = authored;
    let _e221 = zoneDimensions(vec4<f32>(0f, 0f, _e213.x, 0f), _e220);
    shape_10 = _e221;
    let _e223 = seed_10;
    let _e224 = zoneBasisAt(_e223);
    let _e225 = zoneRotation(_e224);
    basis_10 = _e225;
    let _e227 = p_55;
    let _e228 = basis_10;
    let _e229 = zoneLocal(_e227, _e228);
    local_18 = _e229;
    let _e231 = local_18;
    let _e233 = shape_10;
    let _e236 = shape_10;
    d_11 = ((abs(_e231) - _e233.xy) + vec2(_e236.z));
    let _e241 = d_11;
    positive = max(_e241, vec2(0f));
    let _e246 = positive;
    let _e247 = positive;
    cornerNormal = (_e246 / vec2(max(length(_e247), 0.0001f)));
    let _e264 = d_11;
    let _e266 = d_11;
    faceNormal = mix(vec2<f32>(0f, 1f), vec2<f32>(1f, 0f), vec2(step(_e264.y, _e266.x)));
    let _e272 = faceNormal;
    let _e273 = cornerNormal;
    let _e275 = positive;
    let _e276 = positive;
    let _e281 = local_18;
    normal = (mix(_e272, _e273, vec2(step(0.00001f, dot(_e275, _e276)))) * sign(_e281));
    let _e285 = local_18;
    let _e286 = shape_10;
    let _e287 = sdZoneFootprint(_e285, _e286);
    let _e289 = basis_10;
    let _e291 = normal;
    let _e294 = basis_10;
    let _e296 = normal;
    let _e300 = basis_10;
    let _e302 = normal;
    let _e305 = basis_10;
    let _e307 = normal;
    return vec3<f32>(-(_e287), ((_e289.x * _e291.x) - (_e294.y * _e296.y)), ((_e300.y * _e302.x) + (_e305.x * _e307.y)));
}

fn jellyState(seed_11: f32) -> vec4<f32> {
    var seed_12: f32;
    var local_19: vec4<f32>;
    var local_20: vec4<f32>;

    seed_12 = seed_11;
    let _e204 = seed_12;
    if (_e204 < 41.5f) {
        let _e207 = uniforms;
        local_20 = _e207.uBumpFx0_;
    } else {
        let _e209 = seed_12;
        if (_e209 < 42.5f) {
            let _e212 = uniforms;
            local_19 = _e212.uBumpFx1_;
        } else {
            let _e214 = uniforms;
            local_19 = _e214.uBumpFx2_;
        }
        let _e217 = local_19;
        local_20 = _e217;
    }
    let _e219 = local_20;
    return _e219;
}

fn jellyWarp(seed_13: f32) -> vec4<f32> {
    var seed_14: f32;
    var local_21: vec4<f32>;
    var local_22: vec4<f32>;

    seed_14 = seed_13;
    let _e204 = seed_14;
    if (_e204 < 41.5f) {
        let _e207 = uniforms;
        local_22 = _e207.uBumpWarp0_;
    } else {
        let _e209 = seed_14;
        if (_e209 < 42.5f) {
            let _e212 = uniforms;
            local_21 = _e212.uBumpWarp1_;
        } else {
            let _e214 = uniforms;
            local_21 = _e214.uBumpWarp2_;
        }
        let _e217 = local_21;
        local_22 = _e217;
    }
    let _e219 = local_22;
    return _e219;
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
    let _e208 = gFootprint;
    let _e209 = frequency_11;
    span_2 = max((_e208 * _e209), 0.002f);
    let _e214 = span_2;
    if (_e214 >= 1f) {
        let _e217 = duty_4;
        return _e217;
    }
    let _e218 = phase_1;
    let _e219 = duty_4;
    x_3 = (_e218 + (_e219 * 0.5f));
    let _e224 = x_3;
    let _e225 = span_2;
    let _e229 = duty_4;
    let _e230 = stripeIntegral((_e224 + (_e225 * 0.5f)), _e229);
    let _e231 = x_3;
    let _e232 = span_2;
    let _e236 = duty_4;
    let _e237 = stripeIntegral((_e231 - (_e232 * 0.5f)), _e236);
    let _e239 = span_2;
    return clamp(((_e230 - _e237) / _e239), 0f, 1f);
}

fn woodBoardCoordinates(uv_3: vec2<f32>, local_23: ptr<function, vec2<f32>>, boardId: ptr<function, vec2<f32>>) {
    var uv_4: vec2<f32>;
    var row: f32;
    var offset: f32;
    var along_1: f32;

    uv_4 = uv_3;
    let _e206 = uv_4;
    row = floor(((_e206.x + 3.25f) / 0.22f));
    let _e214 = row;
    let _e217 = hash(vec2<f32>(_e214, 2.7f));
    offset = _e217;
    let _e219 = uv_4;
    let _e225 = offset;
    along_1 = (((_e219.y + 3.25f) / 1.65f) + _e225);
    let _e228 = row;
    let _e229 = along_1;
    (*boardId) = vec2<f32>(_e228, floor(_e229));
    let _e232 = uv_4;
    let _e243 = along_1;
    (*local_23) = vec2<f32>(((fract(((_e232.x + 3.25f) / 0.22f)) - 0.5f) * 0.22f), ((fract(_e243) - 0.5f) * 1.65f));
    let _e251 = (*local_23);
    let _e257 = (*boardId);
    let _e262 = hash((_e257 + vec2<f32>(7f, 3f)));
    (*local_23).y = (_e251.y * mix(-1f, 1f, step(0.5f, _e262)));
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
    var poreNoise: vec3<f32>;
    var resolved: f32;

    uv_6 = uv_5;
    identity_1 = identity;
    let _e207 = identity_1;
    let _e210 = identity_1;
    offset_1 = vec2<f32>((_e207 * 13.7f), (_e210 * 5.3f));
    let _e215 = uv_6;
    let _e220 = offset_1;
    let _e223 = materialNoise(((_e215 * vec2<f32>(2.2f, 0.72f)) + _e220), 2.2f);
    warp_4 = _e223;
    let _e225 = uv_6;
    let _e227 = warp_4;
    let _e234 = identity_1;
    crossGrain = ((_e225.x + ((_e227.x - 0.5f) * 0.045f)) + ((_e234 - 0.5f) * 0.36f));
    let _e243 = identity_1;
    let _e247 = uv_6;
    let _e251 = identity_1;
    let _e254 = uv_6;
    let _e258 = identity_1;
    taper = ((0.085f + (0.16f * _e243)) + ((0.13f * ((_e247.y + 0.55f) - _e251)) * ((_e254.y + 0.55f) - _e258)));
    let _e263 = crossGrain;
    let _e264 = crossGrain;
    let _e266 = taper;
    let _e267 = taper;
    radius_2 = sqrt(((_e263 * _e264) + (_e266 * _e267)));
    let _e273 = identity_1;
    frequency_12 = (160f + (_e273 * 70f));
    let _e278 = radius_2;
    let _e279 = frequency_12;
    let _e281 = identity_1;
    let _e285 = warp_4;
    phase_2 = (((_e278 * _e279) + (_e281 * 7f)) + ((_e285.x - 0.5f) * 0.35f));
    let _e293 = phase_2;
    let _e294 = frequency_12;
    let _e298 = woodRingFilter(_e293, (_e294 * 1.6f), 0.19f);
    latewood = _e298;
    let _e300 = uv_6;
    let _e305 = offset_1;
    let _e311 = materialNoise((((_e300 * vec2<f32>(3.1f, 0.85f)) + _e305) + vec2(4.7f)), 3.1f);
    broad = (_e311.x - 0.5f);
    (*slope_1) = vec2(0f);
    let _e323 = crossGrain;
    let _e326 = uv_6;
    let _e331 = offset_1;
    let _e334 = materialNoise((vec2<f32>((_e323 * 83f), (_e326.y * 5.5f)) + _e331), 88f);
    fibres = _e334;
    let _e336 = fibres;
    fibre = (_e336.x - 0.5f);
    let _e340 = fibres;
    (*slope_1) = (_e340.yz * vec2<f32>(0.013f, 0.004f));
    let _e346 = crossGrain;
    let _e349 = uv_6;
    let _e354 = offset_1;
    let _e360 = materialNoise(((vec2<f32>((_e346 * 137f), (_e349.y * 18f)) + _e354) + vec2(2.3f)), 145f);
    poreNoise = _e360;
    let _e363 = detailWeight(145f);
    resolved = _e363;
    let _e367 = poreNoise;
    let _e372 = latewood;
    let _e376 = resolved;
    pores = ((smoothstep(0.64f, 0.87f, _e367.x) * (0.3f + (0.7f * _e372))) * _e376);
    let _e378 = (*slope_1);
    let _e379 = poreNoise;
    let _e385 = pores;
    (*slope_1) = (_e378 - ((_e379.yz * vec2<f32>(0.01f, 0.003f)) * _e385));
    let _e388 = latewood;
    let _e389 = fibre;
    let _e390 = pores;
    let _e391 = broad;
    return vec4<f32>(_e388, _e389, _e390, _e391);
}

fn colorVertex(cell: vec3<f32>, seed_15: f32) -> vec4<f32> {
    var cell_1: vec3<f32>;
    var seed_16: f32;
    var value: f32;
    var dirt: f32;

    cell_1 = cell;
    seed_16 = seed_15;
    let _e206 = cell_1;
    let _e208 = cell_1;
    let _e213 = cell_1;
    let _e215 = seed_16;
    let _e220 = hash(vec2<f32>((_e206.x + (_e208.z * 17f)), (_e213.y + (_e215 * 7f))));
    value = _e220;
    let _e222 = cell_1;
    let _e224 = cell_1;
    let _e231 = cell_1;
    let _e233 = seed_16;
    let _e238 = hash(vec2<f32>(((_e222.z + (_e224.y * 11f)) + 3.2f), (_e231.x + (_e233 * 13f))));
    dirt = _e238;
    let _e248 = value;
    let _e250 = mix(vec3<f32>(0.83f, 0.85f, 0.87f), vec3<f32>(1f, 0.985f, 0.95f), vec3(_e248));
    let _e251 = dirt;
    return vec4<f32>(_e250.x, _e250.y, _e250.z, _e251);
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
    let _e210 = m_3;
    let _e213 = m_3;
    let _e217 = m_3;
    let _e220 = m_3;
    let _e225 = m_3;
    let _e228 = m_3;
    if ((((_e210 > 9.5f) && (_e213 < 13.5f)) || ((_e217 > 14.5f) && (_e220 < 18.5f))) || ((_e225 > 19.5f) && (_e228 < 20.5f))) {
        return vec4<f32>(1f, 1f, 1f, 0f);
    }
    let _e242 = q_8;
    let _e243 = m_3;
    let _e246 = m_3;
    if ((_e243 > 6.5f) && (_e246 < 7.5f)) {
        local_24 = 0.28f;
    } else {
        local_24 = 0.72f;
    }
    let _e253 = local_24;
    grid = (_e242 / vec3(_e253));
    let _e257 = grid;
    cell_2 = floor(_e257);
    let _e260 = grid;
    f_3 = fract(_e260);
    let _e263 = cell_2;
    let _e264 = seed_18;
    let _e265 = colorVertex(_e263, _e264);
    let _e266 = cell_2;
    let _e275 = seed_18;
    let _e276 = colorVertex((_e266 + vec3<f32>(1f, 0f, 0f)), _e275);
    let _e277 = f_3;
    a_7 = mix(_e265, _e276, vec4(_e277.x));
    let _e282 = cell_2;
    let _e291 = seed_18;
    let _e292 = colorVertex((_e282 + vec3<f32>(0f, 1f, 0f)), _e291);
    let _e293 = cell_2;
    let _e302 = seed_18;
    let _e303 = colorVertex((_e293 + vec3<f32>(1f, 1f, 0f)), _e302);
    let _e304 = f_3;
    b_10 = mix(_e292, _e303, vec4(_e304.x));
    let _e309 = cell_2;
    let _e318 = seed_18;
    let _e319 = colorVertex((_e309 + vec3<f32>(0f, 0f, 1f)), _e318);
    let _e320 = cell_2;
    let _e329 = seed_18;
    let _e330 = colorVertex((_e320 + vec3<f32>(1f, 0f, 1f)), _e329);
    let _e331 = f_3;
    c_1 = mix(_e319, _e330, vec4(_e331.x));
    let _e336 = cell_2;
    let _e345 = seed_18;
    let _e346 = colorVertex((_e336 + vec3<f32>(0f, 1f, 1f)), _e345);
    let _e347 = cell_2;
    let _e356 = seed_18;
    let _e357 = colorVertex((_e347 + vec3<f32>(1f, 1f, 1f)), _e356);
    let _e358 = f_3;
    d_12 = mix(_e346, _e357, vec4(_e358.x));
    let _e363 = a_7;
    let _e364 = b_10;
    let _e365 = f_3;
    let _e369 = c_1;
    let _e370 = d_12;
    let _e371 = f_3;
    let _e375 = f_3;
    return mix(mix(_e363, _e364, vec4(_e365.y)), mix(_e369, _e370, vec4(_e371.y)), vec4(_e375.z));
}

fn reliefDepth(m_4: f32) -> f32 {
    var m_5: f32;

    m_5 = m_4;
    let _e204 = m_5;
    if (_e204 < 1.5f) {
        return 0.009f;
    }
    let _e208 = m_5;
    if (_e208 < 2.5f) {
        return 0.0035f;
    }
    let _e212 = m_5;
    if (_e212 < 6.5f) {
        return 0.0025f;
    }
    let _e216 = m_5;
    if (_e216 < 7.5f) {
        return 0.0024f;
    }
    let _e220 = m_5;
    if (_e220 < 8.5f) {
        return 0.003f;
    }
    let _e224 = m_5;
    let _e227 = m_5;
    if ((_e224 > 13.5f) && (_e227 < 14.5f)) {
        return 0.0015f;
    }
    let _e232 = m_5;
    let _e235 = m_5;
    if ((_e232 > 18.5f) && (_e235 < 19.5f)) {
        return 0.007f;
    }
    return 0f;
}

fn reliefWeight(frequency_13: f32) -> f32 {
    var frequency_14: f32;

    frequency_14 = frequency_13;
    let _e207 = gReliefFootprint;
    let _e208 = frequency_14;
    return (1f - smoothstep(0.16f, 0.65f, (_e207 * _e208)));
}

fn reliefNoise(p_56: vec2<f32>, frequency_15: f32) -> f32 {
    var p_57: vec2<f32>;
    var frequency_16: f32;
    var f_4: vec2<f32>;
    var u_2: vec2<f32>;
    var value_1: f32;

    p_57 = p_56;
    frequency_16 = frequency_15;
    let _e206 = p_57;
    f_4 = fract(_e206);
    let _e209 = f_4;
    let _e210 = f_4;
    let _e212 = f_4;
    let _e214 = f_4;
    let _e215 = f_4;
    u_2 = (((_e209 * _e210) * _e212) * ((_e214 * ((_e215 * 6f) - vec2(15f))) + vec2(10f)));
    let _e227 = p_57;
    let _e228 = floor(_e227);
    const _e230 = vec2(251f);
    let _e238 = u_2;
    let _e244 = textureSampleLevel(uReliefNoiseTexture, uReliefNoiseSampler, ((((_e228 - (floor((_e228 / _e230)) * _e230)) + vec2(0.5f)) + _e238) / vec2(256f)), 0f);
    value_1 = _e244.x;
    let _e248 = value_1;
    let _e249 = frequency_16;
    let _e250 = reliefWeight(_e249);
    return mix(0.5f, _e248, _e250);
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
    let _e210 = m_7;
    let _e211 = reliefDepth(_e210);
    depth_1 = _e211;
    let _e213 = depth_1;
    if (_e213 == 0f) {
        return 0f;
    }
    let _e218 = m_7;
    if (_e218 < 1.5f) {
        {
            let _e223 = q_10;
            woodBoardCoordinates(_e223.xz, (&local_25), (&id));
            let _e229 = id;
            let _e233 = hash(vec2<f32>(_e229.x, 2.7f));
            offset_2 = _e233;
            let _e235 = q_10;
            let _e241 = gReliefFootprint;
            let _e242 = stripeCoverage((_e235.x + 3.25f), 0.22f, 0.002f, _e241);
            let _e243 = q_10;
            let _e247 = offset_2;
            let _e253 = gReliefFootprint;
            let _e254 = stripeCoverage(((_e243.z + 3.25f) + (_e247 * 1.65f)), 1.65f, 0.002f, _e253);
            joint = max(_e242, _e254);
            let _e257 = local_25;
            let _e262 = id;
            let _e263 = hash(_e262);
            let _e269 = reliefNoise(((_e257 * vec2<f32>(65f, 4f)) + vec2((_e263 * 7f))), 65f);
            fibre_1 = _e269;
            let _e273 = fibre_1;
            let _e277 = joint;
            h_10 = ((0.12f + (0.26f * _e273)) + (0.62f * _e277));
        }
    } else {
        let _e280 = m_7;
        if (_e280 < 2.5f) {
            {
                let _e285 = q_10;
                let _e291 = q_10;
                yarn = (0.5f + ((0.5f * sin((_e285.x * 440f))) * sin((_e291.z * 360f))));
                let _e302 = yarn;
                let _e304 = reliefWeight(70f);
                h_10 = (0.2f + (0.8f * mix(0.5f, _e302, _e304)));
            }
        } else {
            let _e308 = m_7;
            let _e311 = m_7;
            if ((_e308 > 18.5f) && (_e311 < 19.5f)) {
                {
                    let _e315 = extent_10;
                    let _e317 = extent_10;
                    if (_e315.z >= _e317.x) {
                        let _e320 = q_10;
                        local_26 = _e320;
                    } else {
                        let _e321 = q_10;
                        local_26 = _e321.zyx;
                    }
                    let _e324 = local_26;
                    grain = _e324;
                    let _e328 = grain;
                    let _e332 = grain;
                    let _e337 = grain;
                    let _e342 = seed_20;
                    let _e346 = reliefNoise((vec2<f32>(((_e328.x * 42f) + (_e332.y * 31f)), (_e337.z * 4f)) + vec2(_e342)), 52f);
                    h_10 = (0.22f + (0.78f * _e346));
                }
            } else {
                {
                    let _e349 = m_7;
                    if (_e349 < 6.5f) {
                        local_28 = 38f;
                    } else {
                        let _e353 = m_7;
                        if (_e353 < 8.5f) {
                            local_27 = 27f;
                        } else {
                            local_27 = 34f;
                        }
                        let _e359 = local_27;
                        local_28 = _e359;
                    }
                    let _e361 = local_28;
                    frequency_17 = _e361;
                    let _e365 = q_10;
                    let _e367 = frequency_17;
                    let _e369 = seed_20;
                    let _e372 = frequency_17;
                    let _e373 = reliefNoise(((_e365.xz * _e367) + vec2(_e369)), _e372);
                    let _e374 = q_10;
                    let _e376 = frequency_17;
                    let _e378 = seed_20;
                    let _e384 = frequency_17;
                    let _e385 = reliefNoise((((_e374.xy * _e376) + vec2(_e378)) + vec2(5.7f)), _e384);
                    h_10 = (0.18f + ((0.82f * (_e373 + _e385)) * 0.5f));
                }
            }
        }
    }
    let _e391 = depth_1;
    let _e392 = h_10;
    return (_e391 * clamp(_e392, 0f, 1f));
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
    let _e209 = ro_3;
    let _e210 = rd_5;
    let _e211 = hit_1;
    p_58 = (_e209 + (_e210 * _e211.x));
    let _e219 = hit_1;
    let _e221 = p_58;
    materialCoordinates(_e219.y, _e221, (&q_11), (&e), (&seed_21));
    let _e229 = hit_1;
    c_2.material = _e229.y;
    let _e232 = seed_21;
    c_2.seed = _e232;
    let _e234 = hit_1;
    let _e238 = seed_21;
    c_2.key = ((_e234.y * 100f) + _e238);
    c_2.shape = 1f;
    c_2.radius = 0f;
    c_2.ramp = vec4(0f);
    c_2.warp = vec4(0f);
    let _e252 = p_58;
    let _e253 = q_11;
    center = (_e252 - _e253);
    c_2.pigmentOffset = vec3(0f);
    let _e260 = hit_1;
    m_8 = _e260.y;
    let _e263 = m_8;
    if (_e263 < 1.5f) {
        {
            center = vec3<f32>(0f, -0.055f, 0f);
            e = vec3<f32>(3.25f, 0.055f, 3.25f);
        }
    } else {
        let _e277 = m_8;
        if (_e277 < 2.5f) {
            {
                center = vec3<f32>(0f, 0.005f, 0.78f);
                e = vec3<f32>(2.08f, 0.005f, 1.27f);
                c_2.radius = 0.004f;
            }
        } else {
            let _e291 = m_8;
            if (_e291 < 3.5f) {
                {
                    center = vec3<f32>(0f, 1.58f, -3.23f);
                    e = vec3<f32>(3.25f, 1.62f, 0.045f);
                }
            } else {
                let _e304 = m_8;
                if (_e304 < 4.5f) {
                    {
                        center = vec3<f32>(-3.23f, 1.58f, 0f);
                        e = vec3<f32>(0.045f, 1.62f, 3.25f);
                    }
                } else {
                    let _e317 = m_8;
                    if (_e317 < 5.5f) {
                        {
                            center = vec3<f32>(3.23f, 1.58f, 0f);
                            e = vec3<f32>(0.045f, 1.62f, 3.25f);
                        }
                    } else {
                        let _e329 = m_8;
                        if (_e329 < 6.5f) {
                            {
                                center = vec3<f32>(0f, 3.18f, 0f);
                                e = vec3<f32>(3.25f, 0.045f, 3.25f);
                            }
                        } else {
                            let _e342 = m_8;
                            if (_e342 < 7.5f) {
                                {
                                    let _e345 = cubeCenter();
                                    center = _e345;
                                    let _e348 = cubeScale();
                                    c_2.radius = (0.038f * _e348);
                                }
                            } else {
                                let _e350 = m_8;
                                if (_e350 < 8.5f) {
                                    c_2.radius = 0.045f;
                                } else {
                                    let _e355 = m_8;
                                    let _e358 = m_8;
                                    if ((_e355 > 9.5f) && (_e358 < 11.5f)) {
                                        c_2.shape = 2f;
                                    } else {
                                        let _e364 = m_8;
                                        let _e367 = m_8;
                                        if ((_e364 > 11.5f) && (_e367 < 12.5f)) {
                                            c_2.shape = 4f;
                                        } else {
                                            let _e373 = m_8;
                                            let _e376 = m_8;
                                            if ((_e373 > 12.5f) && (_e376 < 13.5f)) {
                                                {
                                                    c_2.radius = 0.012f;
                                                    {
                                                        let _e397 = p_58;
                                                        let _e398 = origin;
                                                        let _e400 = size_2;
                                                        let _e402 = sdRoundBox((_e397 - _e398), _e400, 0.012f);
                                                        d_13 = _e402;
                                                        let _e404 = includeCandidate(1301f);
                                                        let _e405 = d_13;
                                                        let _e406 = best_1;
                                                        if (_e404 && (_e405 < _e406)) {
                                                            {
                                                                let _e409 = d_13;
                                                                best_1 = _e409;
                                                                let _e410 = origin;
                                                                center = _e410;
                                                                let _e411 = size_2;
                                                                e = _e411;
                                                                c_2.key = 1301f;
                                                            }
                                                        }
                                                    }
                                                    {
                                                        let _e426 = p_58;
                                                        let _e427 = origin_1;
                                                        let _e429 = size_3;
                                                        let _e431 = sdRoundBox((_e426 - _e427), _e429, 0.012f);
                                                        d_13 = _e431;
                                                        let _e433 = includeCandidate(1302f);
                                                        let _e434 = d_13;
                                                        let _e435 = best_1;
                                                        if (_e433 && (_e434 < _e435)) {
                                                            {
                                                                let _e438 = d_13;
                                                                best_1 = _e438;
                                                                let _e439 = origin_1;
                                                                center = _e439;
                                                                let _e440 = size_3;
                                                                e = _e440;
                                                                c_2.key = 1302f;
                                                            }
                                                        }
                                                    }
                                                    {
                                                        let _e454 = p_58;
                                                        let _e455 = origin_2;
                                                        let _e457 = size_4;
                                                        let _e459 = sdRoundBox((_e454 - _e455), _e457, 0.012f);
                                                        d_13 = _e459;
                                                        let _e461 = includeCandidate(1303f);
                                                        let _e462 = d_13;
                                                        let _e463 = best_1;
                                                        if (_e461 && (_e462 < _e463)) {
                                                            {
                                                                let _e466 = d_13;
                                                                best_1 = _e466;
                                                                let _e467 = origin_2;
                                                                center = _e467;
                                                                let _e468 = size_4;
                                                                e = _e468;
                                                                c_2.key = 1303f;
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                let _e471 = m_8;
                                                let _e474 = m_8;
                                                if ((_e471 > 13.5f) && (_e474 < 14.5f)) {
                                                    {
                                                        c_2.radius = 0.02f;
                                                        let _e484 = includeCandidate(1401f);
                                                        if _e484 {
                                                            {
                                                                let _e497 = p_58;
                                                                let _e498 = origin_3;
                                                                let _e500 = size_5;
                                                                let _e502 = sdRoundBox((_e497 - _e498), _e500, 0.02f);
                                                                d_14 = abs(_e502);
                                                                let _e504 = d_14;
                                                                let _e505 = best_2;
                                                                if (_e504 < _e505) {
                                                                    {
                                                                        let _e507 = d_14;
                                                                        best_2 = _e507;
                                                                        let _e508 = origin_3;
                                                                        center = _e508;
                                                                        let _e509 = size_5;
                                                                        e = _e509;
                                                                        c_2.key = 1401f;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        let _e513 = includeCandidate(1402f);
                                                        if _e513 {
                                                            {
                                                                let _e526 = p_58;
                                                                let _e527 = origin_4;
                                                                let _e529 = size_6;
                                                                let _e531 = sdRoundBox((_e526 - _e527), _e529, 0.02f);
                                                                d_14 = abs(_e531);
                                                                let _e533 = d_14;
                                                                let _e534 = best_2;
                                                                if (_e533 < _e534) {
                                                                    {
                                                                        let _e536 = d_14;
                                                                        best_2 = _e536;
                                                                        let _e537 = origin_4;
                                                                        center = _e537;
                                                                        let _e538 = size_6;
                                                                        e = _e538;
                                                                        c_2.key = 1402f;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        let _e542 = includeCandidate(1403f);
                                                        if _e542 {
                                                            {
                                                                let _e554 = p_58;
                                                                let _e555 = origin_5;
                                                                let _e557 = size_7;
                                                                let _e559 = sdRoundBox((_e554 - _e555), _e557, 0.02f);
                                                                d_14 = abs(_e559);
                                                                let _e561 = d_14;
                                                                let _e562 = best_2;
                                                                if (_e561 < _e562) {
                                                                    {
                                                                        let _e564 = d_14;
                                                                        best_2 = _e564;
                                                                        let _e565 = origin_5;
                                                                        center = _e565;
                                                                        let _e566 = size_7;
                                                                        e = _e566;
                                                                        c_2.key = 1403f;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    let _e569 = m_8;
                                                    let _e572 = m_8;
                                                    if ((_e569 > 14.5f) && (_e572 < 15.5f)) {
                                                        {
                                                            let _e576 = uniforms;
                                                            let _e581 = uniforms;
                                                            wall = vec3<f32>(_e576.uTarget.x, (0.74f + _e581.uTargetY.x), -3.185f);
                                                            let _e589 = uniforms;
                                                            let _e594 = uniforms;
                                                            let _e598 = uniforms;
                                                            ring = vec3<f32>(_e589.uTarget.x, (0.03f + _e594.uTargetY.x), _e598.uTarget.y);
                                                            let _e605 = includeCandidate(1501f);
                                                            let _e607 = includeCandidate(1502f);
                                                            let _e609 = p_58;
                                                            let _e610 = wall;
                                                            let _e617 = sdRoundBox((_e609 - _e610), vec3<f32>(0.58f, 0.7f, 0.03f), 0.045f);
                                                            let _e618 = p_58;
                                                            let _e619 = ring;
                                                            let _e621 = sdRing((_e618 - _e619));
                                                            if (_e605 && (!(_e607) || (_e617 < _e621))) {
                                                                {
                                                                    let _e625 = wall;
                                                                    center = _e625;
                                                                    e = vec3<f32>(0.58f, 0.7f, 0.03f);
                                                                    c_2.radius = 0.045f;
                                                                    c_2.key = 1501f;
                                                                }
                                                            } else {
                                                                {
                                                                    let _e634 = ring;
                                                                    center = _e634;
                                                                    e = vec3<f32>(0.515f, 0.018f, 0.515f);
                                                                    c_2.shape = 4f;
                                                                    c_2.key = 1502f;
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        let _e643 = m_8;
                                                        let _e646 = m_8;
                                                        let _e650 = m_8;
                                                        let _e653 = m_8;
                                                        if (((_e643 > 15.5f) && (_e646 < 18.5f)) || ((_e650 > 19.5f) && (_e653 < 20.5f))) {
                                                            {
                                                                let _e660 = e;
                                                                let _e667 = seed_21;
                                                                let _e668 = zoneShapeAt(_e667);
                                                                let _e669 = zoneDimensions(vec4<f32>(0f, 0f, _e660.x, 0f), _e668);
                                                                shape_11 = _e669;
                                                                let _e671 = seed_21;
                                                                let _e672 = zoneBasisAt(_e671);
                                                                let _e673 = zoneRotation(_e672);
                                                                basis_11 = _e673;
                                                                let _e676 = m_8;
                                                                if (_e676 > 19.5f) {
                                                                    local_29 = 5f;
                                                                } else {
                                                                    local_29 = 6f;
                                                                }
                                                                let _e682 = local_29;
                                                                c_2.shape = _e682;
                                                                let _e684 = shape_11;
                                                                let _e686 = basis_11;
                                                                c_2.ramp = vec4<f32>(_e684.z, _e686.x, _e686.y, 0f);
                                                                let _e693 = seed_21;
                                                                let _e694 = zoneMotionAt(_e693);
                                                                c_2.warp = _e694;
                                                                let _e695 = m_8;
                                                                if (_e695 > 19.5f) {
                                                                    let _e700 = c_2;
                                                                    let _e703 = center;
                                                                    c_2.warp.w = (_e700.warp.w - (_e703.y - 0.016f));
                                                                }
                                                            }
                                                        } else {
                                                            let _e708 = m_8;
                                                            let _e711 = m_8;
                                                            if ((_e708 > 18.5f) && (_e711 < 19.5f)) {
                                                                {
                                                                    c_2.radius = 0.018f;
                                                                    let _e717 = seed_21;
                                                                    if (_e717 > 20f) {
                                                                        {
                                                                            c_2.shape = 3f;
                                                                            let _e722 = seed_21;
                                                                            if (_e722 < 21.5f) {
                                                                                let _e725 = uniforms;
                                                                                local_31 = _e725.uRampMeta0_;
                                                                            } else {
                                                                                let _e727 = seed_21;
                                                                                if (_e727 < 22.5f) {
                                                                                    let _e730 = uniforms;
                                                                                    local_30 = _e730.uRampMeta1_;
                                                                                } else {
                                                                                    let _e732 = uniforms;
                                                                                    local_30 = _e732.uRampMeta2_;
                                                                                }
                                                                                let _e735 = local_30;
                                                                                local_31 = _e735;
                                                                            }
                                                                            let _e737 = local_31;
                                                                            meta_6 = _e737;
                                                                            let _e741 = e;
                                                                            let _e744 = meta_6;
                                                                            let _e745 = _e744.yz;
                                                                            c_2.ramp = vec4<f32>((2f * _e741.y), _e745.x, _e745.y, 0f);
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                let _e750 = m_8;
                                                                if (_e750 > 21.5f) {
                                                                    {
                                                                        c_2.shape = 2f;
                                                                        let _e756 = seed_21;
                                                                        let _e757 = jellyState(_e756);
                                                                        c_2.ramp = _e757;
                                                                        let _e759 = seed_21;
                                                                        let _e760 = jellyWarp(_e759);
                                                                        c_2.warp = _e760;
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
    let _e761 = m_8;
    let _e764 = m_8;
    let _e767 = m_8;
    if ((_e761 < 6.5f) || ((_e764 > 12.5f) && (_e767 < 14.5f))) {
        let _e773 = center;
        c_2.pigmentOffset = _e773;
    }
    let _e775 = e;
    c_2.extent = _e775;
    let _e777 = ro_3;
    let _e778 = center;
    c_2.origin = (_e777 - _e778);
    let _e781 = rd_5;
    c_2.direction = _e781;
    let _e782 = m_8;
    let _e785 = m_8;
    if ((_e782 > 6.5f) && (_e785 < 7.5f)) {
        {
            let _e789 = uniforms;
            let _e792 = -(_e789.uCubeQ.xyz);
            let _e793 = uniforms;
            iq_1 = vec4<f32>(_e792.x, _e792.y, _e792.z, _e793.uCubeQ.w);
            let _e802 = iq_1;
            let _e803 = c_2;
            let _e805 = qrot(_e802, _e803.origin);
            c_2.origin = _e805;
            let _e807 = iq_1;
            let _e808 = rd_5;
            let _e809 = qrot(_e807, _e808);
            c_2.direction = _e809;
        }
    }
    let _e810 = c_2;
    return _e810;
}

fn candidateBaseDistance(c_3: ReliefCandidate, p_59: vec3<f32>) -> f32 {
    var c_4: ReliefCandidate;
    var p_60: vec3<f32>;

    c_4 = c_3;
    p_60 = p_59;
    let _e206 = c_4;
    if (_e206.material > 21.5f) {
        let _e210 = p_60;
        let _e211 = c_4;
        let _e213 = c_4;
        let _e216 = c_4;
        let _e218 = jellyDistance(_e210, _e211.extent, _e213.ramp.x, _e216.warp);
        return _e218;
    }
    let _e219 = c_4;
    if (_e219.shape > 5.5f) {
        let _e223 = p_60;
        let _e224 = c_4;
        let _e227 = c_4;
        let _e230 = c_4;
        let _e234 = c_4;
        let _e237 = zonePlate(_e223, vec3<f32>(_e224.extent.x, _e227.extent.z, _e230.ramp.x), _e234.ramp.yz);
        return _e237;
    }
    let _e238 = c_4;
    if (_e238.shape > 4.5f) {
        let _e242 = p_60;
        let _e243 = c_4;
        let _e246 = c_4;
        let _e248 = jumpCap(_e242, _e243.extent.x, _e246.warp);
        return _e248;
    }
    let _e249 = c_4;
    if (_e249.shape > 3.5f) {
        let _e253 = p_60;
        let _e254 = sdRing(_e253);
        return _e254;
    }
    let _e255 = c_4;
    if (_e255.shape > 2.5f) {
        let _e259 = p_60;
        let _e261 = c_4;
        let _e271 = c_4;
        let _e276 = c_4;
        let _e284 = c_4;
        let _e286 = rampObj((_e259 + vec3<f32>(0f, _e261.extent.y, 0f)), vec4<f32>(0f, 0f, (_e271.extent.x * 2f), (_e276.extent.z * 2f)), _e284.ramp);
        return _e286.x;
    }
    let _e288 = c_4;
    if (_e288.shape > 1.5f) {
        let _e292 = p_60;
        let _e293 = c_4;
        let _e296 = c_4;
        let _e299 = sdCyl(_e292, _e293.extent.x, _e296.extent.y);
        return _e299;
    }
    let _e300 = p_60;
    let _e301 = c_4;
    let _e303 = c_4;
    let _e305 = sdRoundBox(_e300, _e301.extent, _e303.radius);
    return _e305;
}

fn candidateReliefDistance(c_5: ReliefCandidate, p_61: vec3<f32>, envelope: ptr<function, f32>) -> f32 {
    var c_6: ReliefCandidate;
    var p_62: vec3<f32>;

    c_6 = c_5;
    p_62 = p_61;
    let _e207 = c_6;
    let _e208 = p_62;
    let _e209 = candidateBaseDistance(_e207, _e208);
    (*envelope) = _e209;
    let _e210 = (*envelope);
    let _e211 = c_6;
    let _e213 = reliefDepth(_e211.material);
    if (_e210 < -(_e213)) {
        let _e216 = (*envelope);
        return _e216;
    }
    let _e217 = (*envelope);
    let _e218 = c_6;
    let _e220 = p_62;
    let _e221 = c_6;
    let _e224 = c_6;
    let _e226 = c_6;
    let _e228 = surfaceInset(_e218.material, (_e220 + _e221.pigmentOffset), _e224.extent, _e226.seed);
    return (_e217 + _e228);
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
    let _e206 = c_8;
    let _e208 = c_8;
    let _e210 = t_2;
    p_63 = (_e206.origin + (_e208.direction * _e210));
    loop {
        let _e224 = i_8;
        if !((_e224 < 6i)) {
            break;
        }
        {
            let _e231 = i_8;
            if (_e231 < 2i) {
                local_33 = vec3<f32>(1f, 0f, 0f);
            } else {
                let _e241 = i_8;
                if (_e241 < 4i) {
                    local_32 = vec3<f32>(0f, 1f, 0f);
                } else {
                    local_32 = vec3<f32>(0f, 0f, 1f);
                }
                let _e259 = local_32;
                local_33 = _e259;
            }
            let _e261 = local_33;
            axis_1 = _e261;
            let _e263 = i_8;
            let _e264 = f32(_e263);
            if ((_e264 - (floor((_e264 / 2f)) * 2f)) < 0.5f) {
                local_34 = 1f;
            } else {
                local_34 = -1f;
            }
            let _e276 = local_34;
            side_1 = _e276;
            let _e278 = gradient_1;
            let _e279 = axis_1;
            let _e280 = side_1;
            let _e282 = c_8;
            let _e283 = p_63;
            let _e284 = axis_1;
            let _e285 = side_1;
            let _e286 = d_15;
            let _e291 = candidateBaseDistance(_e282, (_e283 + (_e284 * (_e285 * _e286.x))));
            gradient_1 = (_e278 + ((_e279 * _e280) * _e291));
        }
        continuing {
            let _e228 = i_8;
            i_8 = (_e228 + 1i);
        }
    }
    let _e294 = gradient_1;
    n_4 = normalize(_e294);
    let _e297 = c_8;
    let _e301 = c_8;
    if ((_e297.material > 6.5f) && (_e301.material < 7.5f)) {
        let _e306 = uniforms;
        let _e308 = n_4;
        let _e309 = qrot(_e306.uCubeQ, _e308);
        local_35 = _e309;
    } else {
        let _e310 = n_4;
        local_35 = _e310;
    }
    let _e312 = local_35;
    return _e312;
}

fn candidateBoxExit(c_9: ReliefCandidate, t_3: f32) -> f32 {
    var c_10: ReliefCandidate;
    var t_4: f32;
    var p_64: vec3<f32>;
    var e_1: vec3<f32>;
    var span_3: f32 = 24f;

    c_10 = c_9;
    t_4 = t_3;
    let _e206 = c_10;
    let _e208 = c_10;
    let _e210 = t_4;
    p_64 = (_e206.origin + (_e208.direction * _e210));
    let _e214 = c_10;
    e_1 = _e214.extent;
    let _e217 = c_10;
    if (_e217.shape > 2.5f) {
        let _e222 = e_1;
        e_1.y = (_e222.y + 0.025f);
    }
    let _e228 = c_10;
    if (abs(_e228.direction.x) > 0.00001f) {
        let _e234 = span_3;
        let _e235 = c_10;
        let _e239 = e_1;
        let _e242 = p_64;
        let _e245 = c_10;
        span_3 = min(_e234, (((sign(_e235.direction.x) * _e239.x) - _e242.x) / _e245.direction.x));
    }
    let _e250 = c_10;
    if (abs(_e250.direction.y) > 0.00001f) {
        let _e256 = span_3;
        let _e257 = c_10;
        let _e261 = e_1;
        let _e264 = p_64;
        let _e267 = c_10;
        span_3 = min(_e256, (((sign(_e257.direction.y) * _e261.y) - _e264.y) / _e267.direction.y));
    }
    let _e272 = c_10;
    if (abs(_e272.direction.z) > 0.00001f) {
        let _e278 = span_3;
        let _e279 = c_10;
        let _e283 = e_1;
        let _e286 = p_64;
        let _e289 = c_10;
        span_3 = min(_e278, (((sign(_e279.direction.z) * _e283.z) - _e286.z) / _e289.direction.z));
    }
    let _e294 = t_4;
    let _e295 = span_3;
    return (_e294 + max(_e295, 0f));
}

fn parallaxOcclusion(c_11: ReliefCandidate, entry: f32) -> vec2<f32> {
    var c_12: ReliefCandidate;
    var entry_1: f32;
    var start: f32;
    var end: f32;
    var lo: f32;
    var hi: f32;
    var loD: f32 = 1f;
    var hiD: f32 = 1f;
    var t_5: f32;
    var envelope_1: f32 = 1f;
    var refining: bool = false;
    var refinements: i32 = 0i;
    var i_9: i32 = 0i;
    var f_5: f32;
    var d_16: f32;

    c_12 = c_11;
    entry_1 = entry;
    let _e207 = entry_1;
    start = max(0f, (_e207 - 0.002f));
    let _e212 = c_12;
    let _e213 = start;
    let _e214 = candidateBoxExit(_e212, _e213);
    end = _e214;
    let _e216 = start;
    lo = _e216;
    let _e218 = end;
    hi = _e218;
    let _e224 = start;
    t_5 = _e224;
    loop {
        let _e234 = i_9;
        if !((_e234 < 18i)) {
            break;
        }
        {
            let _e243 = refining;
            if _e243 {
                let _e244 = lo;
                let _e245 = hi;
                let _e246 = loD;
                let _e247 = loD;
                let _e248 = hiD;
                t_5 = mix(_e244, _e245, clamp((_e246 / max((_e247 - _e248), 0.000001f)), 0.1f, 0.9f));
            } else {
                {
                    let _e257 = i_9;
                    if (_e257 >= 14i) {
                        break;
                    }
                    let _e260 = i_9;
                    f_5 = (f32(_e260) / 13f);
                    let _e268 = start;
                    let _e269 = end;
                    let _e270 = f_5;
                    let _e271 = f_5;
                    t_5 = mix(_e268, _e269, (_e270 * _e271));
                }
            }
            let _e274 = c_12;
            let _e275 = c_12;
            let _e277 = c_12;
            let _e279 = t_5;
            let _e284 = candidateReliefDistance(_e274, (_e275.origin + (_e277.direction * _e279)), (&envelope_1));
            d_16 = _e284;
            let _e286 = refining;
            if _e286 {
                {
                    let _e287 = d_16;
                    if (_e287 > 0f) {
                        {
                            let _e290 = t_5;
                            lo = _e290;
                            let _e291 = d_16;
                            loD = _e291;
                        }
                    } else {
                        {
                            let _e292 = t_5;
                            hi = _e292;
                            let _e293 = d_16;
                            hiD = _e293;
                        }
                    }
                    let _e294 = refinements;
                    refinements = (_e294 + 1i);
                    let _e297 = refinements;
                    if (_e297 >= 4i) {
                        break;
                    }
                }
            } else {
                let _e300 = d_16;
                if (_e300 <= 0f) {
                    {
                        let _e303 = t_5;
                        hi = _e303;
                        let _e304 = d_16;
                        hiD = _e304;
                        refining = true;
                    }
                } else {
                    {
                        let _e306 = t_5;
                        lo = _e306;
                        let _e307 = d_16;
                        loD = _e307;
                    }
                }
            }
        }
        continuing {
            let _e240 = i_9;
            i_9 = (_e240 + 1i);
        }
    }
    let _e308 = refining;
    if _e308 {
        let _e309 = lo;
        let _e310 = hi;
        let _e311 = loD;
        let _e312 = loD;
        let _e313 = hiD;
        let _e322 = c_12;
        return vec2<f32>(mix(_e309, _e310, clamp((_e311 / max((_e312 - _e313), 0.000001f)), 0f, 1f)), _e322.material);
    }
    let _e325 = start;
    return vec2<f32>(_e325, -1f);
}

fn reliefGradient(m_9: f32, q_12: vec3<f32>, extent_11: vec3<f32>, seed_22: f32) -> vec3<f32> {
    var m_10: f32;
    var q_13: vec3<f32>;
    var extent_12: vec3<f32>;
    var seed_23: f32;
    var e_2: f32;
    var gradient_2: vec3<f32> = vec3(0f);
    var i_10: i32 = 0i;
    var local_36: vec3<f32>;
    var local_37: vec3<f32>;
    var axis_2: vec3<f32>;
    var local_38: f32;
    var side_2: f32;

    m_10 = m_9;
    q_13 = q_12;
    extent_12 = extent_11;
    seed_23 = seed_22;
    let _e210 = m_10;
    let _e211 = reliefDepth(_e210);
    if (_e211 > 0f) {
        {
            let _e215 = gReliefFootprint;
            e_2 = max(0.0015f, (_e215 * 0.5f));
            loop {
                let _e226 = i_10;
                if !((_e226 < 6i)) {
                    break;
                }
                {
                    let _e233 = i_10;
                    if (_e233 < 2i) {
                        local_37 = vec3<f32>(1f, 0f, 0f);
                    } else {
                        let _e243 = i_10;
                        if (_e243 < 4i) {
                            local_36 = vec3<f32>(0f, 1f, 0f);
                        } else {
                            local_36 = vec3<f32>(0f, 0f, 1f);
                        }
                        let _e261 = local_36;
                        local_37 = _e261;
                    }
                    let _e263 = local_37;
                    axis_2 = _e263;
                    let _e265 = i_10;
                    let _e266 = f32(_e265);
                    if ((_e266 - (floor((_e266 / 2f)) * 2f)) < 0.5f) {
                        local_38 = 1f;
                    } else {
                        local_38 = -1f;
                    }
                    let _e278 = local_38;
                    side_2 = _e278;
                    let _e280 = gradient_2;
                    let _e281 = axis_2;
                    let _e282 = side_2;
                    let _e284 = m_10;
                    let _e285 = q_13;
                    let _e286 = axis_2;
                    let _e287 = side_2;
                    let _e288 = e_2;
                    let _e292 = extent_12;
                    let _e293 = seed_23;
                    let _e294 = surfaceInset(_e284, (_e285 + (_e286 * (_e287 * _e288))), _e292, _e293);
                    gradient_2 = (_e280 + ((_e281 * _e282) * _e294));
                }
                continuing {
                    let _e230 = i_10;
                    i_10 = (_e230 + 1i);
                }
            }
            let _e297 = gradient_2;
            let _e299 = e_2;
            return (_e297 / vec3((2f * _e299)));
        }
    }
    return vec3(0f);
}

fn reliefVisibility(m_11: f32, p_65: vec3<f32>, n_5: vec3<f32>, light: vec3<f32>) -> f32 {
    var m_12: f32;
    var p_66: vec3<f32>;
    var n_6: vec3<f32>;
    var light_1: vec3<f32>;
    var q_14: vec3<f32>;
    var e_3: vec3<f32>;
    var seed_24: f32;
    var iq_2: vec4<f32>;
    var depth_2: f32;
    var visibility_1: f32 = 1f;
    var i_11: i32 = 1i;
    var distance: f32;
    var clearance: f32;

    m_12 = m_11;
    p_66 = p_65;
    n_6 = n_5;
    light_1 = light;
    let _e210 = m_12;
    let _e211 = reliefDepth(_e210);
    if (_e211 > 0f) {
        {
            let _e217 = m_12;
            let _e218 = p_66;
            materialCoordinates(_e217, _e218, (&q_14), (&e_3), (&seed_24));
            let _e225 = m_12;
            let _e228 = m_12;
            if ((_e225 > 6.5f) && (_e228 < 7.5f)) {
                {
                    let _e232 = uniforms;
                    let _e235 = -(_e232.uCubeQ.xyz);
                    let _e236 = uniforms;
                    iq_2 = vec4<f32>(_e235.x, _e235.y, _e235.z, _e236.uCubeQ.w);
                    let _e244 = iq_2;
                    let _e245 = n_6;
                    let _e246 = qrot(_e244, _e245);
                    n_6 = _e246;
                    let _e247 = iq_2;
                    let _e248 = light_1;
                    let _e249 = qrot(_e247, _e248);
                    light_1 = _e249;
                }
            }
            let _e250 = m_12;
            let _e251 = q_14;
            let _e252 = e_3;
            let _e253 = seed_24;
            let _e254 = surfaceInset(_e250, _e251, _e252, _e253);
            depth_2 = _e254;
            loop {
                let _e260 = i_11;
                if !((_e260 <= 4i)) {
                    break;
                }
                {
                    let _e267 = i_11;
                    distance = (f32(_e267) * 0.004f);
                    let _e272 = n_6;
                    let _e273 = light_1;
                    let _e275 = distance;
                    let _e277 = m_12;
                    let _e278 = q_14;
                    let _e279 = light_1;
                    let _e280 = distance;
                    let _e283 = e_3;
                    let _e284 = seed_24;
                    let _e285 = surfaceInset(_e277, (_e278 + (_e279 * _e280)), _e283, _e284);
                    let _e287 = depth_2;
                    clearance = (((dot(_e272, _e273) * _e275) + _e285) - _e287);
                    let _e290 = visibility_1;
                    let _e294 = clearance;
                    visibility_1 = min(_e290, smoothstep(-0.0015f, 0.0005f, _e294));
                }
                continuing {
                    let _e264 = i_11;
                    i_11 = (_e264 + 1i);
                }
            }
            let _e299 = visibility_1;
            return mix(0.4f, 1f, _e299);
        }
    }
    return 1f;
}

fn reliefLighting(m_13: f32, q_15: vec3<f32>, extent_13: vec3<f32>, seed_25: f32, normal_1: vec3<f32>, keyLight: vec3<f32>, rimLight: vec3<f32>, gradient_3: ptr<function, vec3<f32>>, visibility_2: ptr<function, vec2<f32>>) {
    var m_14: f32;
    var q_16: vec3<f32>;
    var extent_14: vec3<f32>;
    var seed_26: f32;
    var normal_2: vec3<f32>;
    var keyLight_1: vec3<f32>;
    var rimLight_1: vec3<f32>;
    var stepSize: f32;
    var center_1: f32 = 0f;
    var shadow: vec2<f32> = vec2(1f);
    var i_12: i32 = 0i;
    var axis_3: vec3<f32>;
    var samplePoint: vec3<f32>;
    var light_2: vec3<f32>;
    var side_3: f32;
    var distance_1: f32;
    var local_39: vec3<f32>;
    var local_40: vec3<f32>;
    var local_41: f32;
    var local_42: vec3<f32>;
    var local_43: i32;
    var height: f32;
    var visible: f32;

    m_14 = m_13;
    q_16 = q_15;
    extent_14 = extent_13;
    seed_26 = seed_25;
    normal_2 = normal_1;
    keyLight_1 = keyLight;
    rimLight_1 = rimLight;
    (*gradient_3) = vec3(0f);
    (*visibility_2) = vec2(1f);
    let _e224 = m_14;
    let _e225 = reliefDepth(_e224);
    if (_e225 > 0f) {
        {
            let _e229 = gReliefFootprint;
            stepSize = max(0.0015f, (_e229 * 0.5f));
            loop {
                let _e242 = i_12;
                if !((_e242 < 15i)) {
                    break;
                }
                {
                    axis_3 = vec3(0f);
                    let _e253 = q_16;
                    samplePoint = _e253;
                    let _e255 = keyLight_1;
                    light_2 = _e255;
                    side_3 = 1f;
                    distance_1 = 0f;
                    let _e261 = i_12;
                    let _e264 = i_12;
                    if ((_e261 > 0i) && (_e264 < 7i)) {
                        {
                            let _e268 = i_12;
                            if (_e268 < 3i) {
                                local_40 = vec3<f32>(1f, 0f, 0f);
                            } else {
                                let _e278 = i_12;
                                if (_e278 < 5i) {
                                    local_39 = vec3<f32>(0f, 1f, 0f);
                                } else {
                                    local_39 = vec3<f32>(0f, 0f, 1f);
                                }
                                let _e296 = local_39;
                                local_40 = _e296;
                            }
                            let _e298 = local_40;
                            axis_3 = _e298;
                            let _e299 = i_12;
                            let _e302 = f32((_e299 - 1i));
                            if ((_e302 - (floor((_e302 / 2f)) * 2f)) < 0.5f) {
                                local_41 = 1f;
                            } else {
                                local_41 = -1f;
                            }
                            let _e314 = local_41;
                            side_3 = _e314;
                            let _e315 = q_16;
                            let _e316 = axis_3;
                            let _e317 = side_3;
                            let _e318 = stepSize;
                            samplePoint = (_e315 + (_e316 * (_e317 * _e318)));
                        }
                    } else {
                        let _e322 = i_12;
                        if (_e322 >= 7i) {
                            {
                                let _e325 = i_12;
                                if (_e325 < 11i) {
                                    let _e328 = keyLight_1;
                                    local_42 = _e328;
                                } else {
                                    let _e329 = rimLight_1;
                                    local_42 = _e329;
                                }
                                let _e331 = local_42;
                                light_2 = _e331;
                                let _e332 = i_12;
                                if (_e332 < 11i) {
                                    let _e335 = i_12;
                                    local_43 = (_e335 - 6i);
                                } else {
                                    let _e338 = i_12;
                                    local_43 = (_e338 - 10i);
                                }
                                let _e342 = local_43;
                                distance_1 = (f32(_e342) * 0.004f);
                                let _e346 = q_16;
                                let _e347 = light_2;
                                let _e348 = distance_1;
                                samplePoint = (_e346 + (_e347 * _e348));
                            }
                        }
                    }
                    let _e351 = m_14;
                    let _e352 = samplePoint;
                    let _e353 = extent_14;
                    let _e354 = seed_26;
                    let _e355 = surfaceInset(_e351, _e352, _e353, _e354);
                    height = _e355;
                    let _e357 = i_12;
                    if (_e357 == 0i) {
                        let _e360 = height;
                        center_1 = _e360;
                    } else {
                        let _e361 = i_12;
                        if (_e361 < 7i) {
                            let _e364 = (*gradient_3);
                            let _e365 = axis_3;
                            let _e366 = side_3;
                            let _e367 = height;
                            (*gradient_3) = (_e364 + (_e365 * (_e366 * _e367)));
                        } else {
                            {
                                let _e374 = normal_2;
                                let _e375 = light_2;
                                let _e377 = distance_1;
                                let _e379 = height;
                                let _e381 = center_1;
                                visible = smoothstep(-0.0015f, 0.0005f, (((dot(_e374, _e375) * _e377) + _e379) - _e381));
                                let _e385 = i_12;
                                if (_e385 < 11i) {
                                    let _e389 = shadow;
                                    let _e391 = visible;
                                    shadow.x = min(_e389.x, _e391);
                                } else {
                                    let _e394 = shadow;
                                    let _e396 = visible;
                                    shadow.y = min(_e394.y, _e396);
                                }
                            }
                        }
                    }
                }
                continuing {
                    let _e246 = i_12;
                    i_12 = (_e246 + 1i);
                }
            }
            let _e398 = (*gradient_3);
            let _e400 = stepSize;
            (*gradient_3) = (_e398 / vec3((2f * _e400)));
            let _e409 = shadow;
            (*visibility_2) = mix(vec2(0.4f), vec2(1f), _e409);
            return;
        }
    } else {
        return;
    }
}

fn woodMaterial(m_15: f32, p_67: vec3<f32>, n_7: vec3<f32>, extent_15: vec3<f32>, seed_27: f32, worldPoint: vec3<f32>, zoneEdge: vec3<f32>, albedo: ptr<function, vec3<f32>>, rough: ptr<function, f32>, spec: ptr<function, f32>, emit: ptr<function, vec3<f32>>, layers: ptr<function, vec4<f32>>, relief: ptr<function, vec3<f32>>) {
    var m_16: f32;
    var p_68: vec3<f32>;
    var n_8: vec3<f32>;
    var extent_16: vec3<f32>;
    var seed_28: f32;
    var worldPoint_1: vec3<f32>;
    var zoneEdge_1: vec3<f32>;
    var uv_7: vec2<f32>;
    var local_44: vec2<f32>;
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
    seed_28 = seed_27;
    worldPoint_1 = worldPoint;
    zoneEdge_1 = zoneEdge;
    let _e222 = p_68;
    let _e223 = n_8;
    let _e224 = faceUV(_e222, _e223);
    uv_7 = _e224;
    let _e228 = uv_7;
    woodBoardCoordinates(_e228, (&local_44), (&id_1));
    let _e233 = id_1;
    let _e238 = hash((_e233 + vec2<f32>(11f, 4f)));
    identity_2 = _e238;
    let _e241 = local_44;
    let _e242 = identity_2;
    let _e245 = woodAnatomy(_e241, _e242, (&slope_2));
    tissue = _e245;
    let _e247 = id_1;
    row_1 = _e247.x;
    let _e250 = row_1;
    let _e253 = hash(vec2<f32>(_e250, 2.7f));
    offset_3 = _e253;
    let _e255 = uv_7;
    let _e261 = filteredStripe((_e255.x + 3.25f), 0.22f, 0.002f);
    let _e262 = uv_7;
    let _e266 = offset_3;
    let _e272 = filteredStripe(((_e262.y + 3.25f) + (_e266 * 1.65f)), 1.65f, 0.002f);
    joint_1 = max(_e261, _e272);
    let _e283 = identity_2;
    pigment = mix(vec3<f32>(0.57f, 0.383f, 0.213f), vec3<f32>(0.66f, 0.456f, 0.267f), vec3(_e283));
    let _e287 = pigment;
    let _e289 = tissue;
    let _e296 = tissue;
    let _e301 = tissue;
    let _e306 = tissue;
    let _e311 = joint_1;
    (*albedo) = (_e287 * (((((1f - ((_e289.x - 0.19f) * 0.26f)) + (_e296.y * 0.085f)) + (_e301.w * 0.16f)) - (_e306.z * 0.2f)) - (_e311 * 0.25f)));
    let _e317 = identity_2;
    let _e323 = tissue;
    let _e328 = tissue;
    let _e333 = tissue;
    let _e338 = joint_1;
    (*rough) = (((((0.545f + ((_e317 - 0.5f) * 0.034f)) + (_e323.x * 0.035f)) - (_e328.y * 0.022f)) + (_e333.z * 0.085f)) + (_e338 * 0.08f));
    (*spec) = 0.2f;
    let _e343 = local_44;
    let _e348 = microRelief(_e343, vec2<f32>(27f, 3.2f), 0.017f);
    (*relief) = _e348;
    let _e349 = (*relief);
    let _e351 = (*relief);
    let _e353 = slope_2;
    let _e354 = (_e351.xy + _e353);
    (*relief).x = _e354.x;
    (*relief).y = _e354.y;
    let _e360 = (*relief);
    let _e366 = id_1;
    let _e371 = hash((_e366 + vec2<f32>(7f, 3f)));
    (*relief).y = (_e360.y * mix(-1f, 1f, step(0.5f, _e371)));
    let _e378 = joint_1;
    (*layers).y = (0.09f * (1f - (_e378 * 0.8f)));
    let _e385 = tissue;
    (*layers).z = (0.38f + (_e385.x * 0.025f));
    return;
}

fn carpetMaterial(m_17: f32, p_69: vec3<f32>, n_9: vec3<f32>, extent_17: vec3<f32>, seed_29: f32, worldPoint_2: vec3<f32>, zoneEdge_2: vec3<f32>, albedo_1: ptr<function, vec3<f32>>, rough_1: ptr<function, f32>, spec_1: ptr<function, f32>, emit_1: ptr<function, vec3<f32>>, layers_1: ptr<function, vec4<f32>>, relief_1: ptr<function, vec3<f32>>) {
    var m_18: f32;
    var p_70: vec3<f32>;
    var n_10: vec3<f32>;
    var extent_18: vec3<f32>;
    var seed_30: f32;
    var worldPoint_3: vec3<f32>;
    var zoneEdge_3: vec3<f32>;
    var uv_8: vec2<f32>;
    var binding: f32;
    var nap: f32;
    var yarn_1: f32;
    var stitch: f32;

    m_18 = m_17;
    p_70 = p_69;
    n_10 = n_9;
    extent_18 = extent_17;
    seed_30 = seed_29;
    worldPoint_3 = worldPoint_2;
    zoneEdge_3 = zoneEdge_2;
    let _e222 = p_70;
    uv_8 = _e222.xz;
    let _e227 = p_70;
    let _e233 = p_70;
    binding = max(smoothstep(2f, 2.075f, abs(_e227.x)), smoothstep(1.19f, 1.265f, abs((_e233.z - 0.78f))));
    let _e241 = uv_8;
    let _e247 = materialNoise((_e241 * vec2<f32>(5f, 8f)), 8f);
    nap = (_e247.x - 0.5f);
    let _e257 = nap;
    let _e261 = binding;
    (*albedo_1) = (vec3<f32>(0.245f, 0.262f, 0.269f) * ((1f + (_e257 * 0.055f)) - (_e261 * 0.16f)));
    let _e266 = uv_8;
    let _e271 = uv_8;
    let _e278 = detailWeight(70f);
    yarn_1 = ((sin((_e266.x * 440f)) * sin((_e271.y * 360f))) * _e278);
    let _e281 = (*albedo_1);
    let _e283 = yarn_1;
    (*albedo_1) = (_e281 * (1f + (_e283 * 0.065f)));
    let _e288 = p_70;
    let _e292 = filteredStripe(_e288.x, 0.072f, 0.012f);
    let _e295 = p_70;
    let _e302 = p_70;
    let _e306 = filteredStripe(_e302.z, 0.072f, 0.012f);
    let _e309 = p_70;
    stitch = max((_e292 * smoothstep(1.17f, 1.21f, abs((_e295.z - 0.78f)))), (_e306 * smoothstep(1.98f, 2.02f, abs(_e309.x))));
    let _e316 = (*albedo_1);
    let _e318 = stitch;
    let _e319 = binding;
    (*albedo_1) = (_e316 * (1f + ((_e318 * _e319) * 0.045f)));
    (*rough_1) = 0.96f;
    (*spec_1) = 0.07f;
    (*layers_1).w = 0.1f;
    let _e329 = uv_8;
    let _e334 = microRelief(_e329, vec2<f32>(36f, 48f), 0.038f);
    (*relief_1) = _e334;
    return;
}

fn wallMaterial(m_19: f32, p_71: vec3<f32>, n_11: vec3<f32>, extent_19: vec3<f32>, seed_31: f32, worldPoint_4: vec3<f32>, zoneEdge_4: vec3<f32>, albedo_2: ptr<function, vec3<f32>>, rough_2: ptr<function, f32>, spec_2: ptr<function, f32>, emit_2: ptr<function, vec3<f32>>, layers_2: ptr<function, vec4<f32>>, relief_2: ptr<function, vec3<f32>>) {
    var m_20: f32;
    var p_72: vec3<f32>;
    var n_12: vec3<f32>;
    var extent_20: vec3<f32>;
    var seed_32: f32;
    var worldPoint_5: vec3<f32>;
    var zoneEdge_5: vec3<f32>;
    var uv_9: vec2<f32>;
    var mineral: f32;
    var panel: f32;
    var pore: f32;

    m_20 = m_19;
    p_72 = p_71;
    n_12 = n_11;
    extent_20 = extent_19;
    seed_32 = seed_31;
    worldPoint_5 = worldPoint_4;
    zoneEdge_5 = zoneEdge_4;
    let _e222 = p_72;
    let _e223 = n_12;
    let _e224 = faceUV(_e222, _e223);
    uv_9 = _e224;
    let _e226 = uv_9;
    let _e230 = materialNoise((_e226 * 0.85f), 0.85f);
    mineral = (_e230.x - 0.5f);
    let _e235 = uv_9;
    let _e241 = filteredStripe((_e235.x + 0.8f), 1.6f, 0.003f);
    panel = _e241;
    let _e243 = m_20;
    if (_e243 < 3.5f) {
        (*albedo_2) = vec3<f32>(0.67f, 0.45f, 0.22f);
    } else {
        let _e250 = m_20;
        if (_e250 < 4.5f) {
            (*albedo_2) = vec3<f32>(0.35f, 0.49f, 0.26f);
        } else {
            let _e257 = m_20;
            if (_e257 < 5.5f) {
                (*albedo_2) = vec3<f32>(0.74f, 0.74f, 0.7f);
            } else {
                (*albedo_2) = vec3<f32>(0.58f, 0.61f, 0.6f);
            }
        }
    }
    let _e268 = (*albedo_2);
    let _e270 = mineral;
    let _e274 = panel;
    (*albedo_2) = (_e268 * ((1f + (_e270 * 0.028f)) - (_e274 * 0.018f)));
    let _e280 = mineral;
    (*rough_2) = (0.86f + (_e280 * 0.035f));
    (*spec_2) = 0.18f;
    let _e285 = uv_9;
    let _e289 = materialNoise((_e285 * 63f), 63f);
    pore = (_e289.x - 0.5f);
    let _e294 = (*rough_2);
    let _e295 = pore;
    (*rough_2) = (_e294 + (_e295 * 0.025f));
    let _e299 = (*albedo_2);
    let _e301 = pore;
    (*albedo_2) = (_e299 * (1f + (_e301 * 0.011f)));
    let _e306 = uv_9;
    let _e311 = microRelief(_e306, vec2<f32>(21f, 26f), 0.016f);
    (*relief_2) = _e311;
    return;
}

fn cubeMaterial(m_21: f32, p_73: vec3<f32>, n_13: vec3<f32>, extent_21: vec3<f32>, seed_33: f32, worldPoint_6: vec3<f32>, zoneEdge_6: vec3<f32>, albedo_3: ptr<function, vec3<f32>>, rough_3: ptr<function, f32>, spec_3: ptr<function, f32>, emit_3: ptr<function, vec3<f32>>, layers_3: ptr<function, vec4<f32>>, relief_3: ptr<function, vec3<f32>>) {
    var m_22: f32;
    var p_74: vec3<f32>;
    var n_14: vec3<f32>;
    var extent_22: vec3<f32>;
    var seed_34: f32;
    var worldPoint_7: vec3<f32>;
    var zoneEdge_7: vec3<f32>;
    var uv_10: vec2<f32>;
    var edge: f32;
    var paint: f32;
    var abrasion: f32 = 0f;
    var scratches: f32 = 0f;
    var islands: f32;
    var lower: f32;
    var slime: f32;
    var wet: f32;

    m_22 = m_21;
    p_74 = p_73;
    n_14 = n_13;
    extent_22 = extent_21;
    seed_34 = seed_33;
    worldPoint_7 = worldPoint_6;
    zoneEdge_7 = zoneEdge_6;
    let _e222 = p_74;
    let _e223 = n_14;
    let _e224 = faceUV(_e222, _e223);
    uv_10 = _e224;
    let _e226 = p_74;
    let _e227 = cubeEdge(_e226);
    edge = _e227;
    let _e229 = uv_10;
    let _e237 = materialNoise(((_e229 * 17f) + vec2<f32>(2.1f, 5.3f)), 17f);
    paint = (_e237.x - 0.5f);
    let _e246 = edge;
    abrasion = (_e246 * 0.025f);
    let _e249 = uv_10;
    let _e257 = materialNoise(((_e249 * 31f) + vec2<f32>(7.4f, 2.2f)), 31f);
    islands = _e257.x;
    let _e260 = edge;
    let _e263 = islands;
    let _e269 = detailWeight(31f);
    abrasion = (((_e260 * smoothstep(0.68f, 0.91f, _e263)) * 0.18f) * _e269);
    let _e271 = uv_10;
    let _e273 = uv_10;
    let _e280 = filteredStripe((_e271.x + (_e273.y * 0.18f)), 0.022f, 0.00065f);
    let _e283 = uv_10;
    let _e289 = materialNoise((_e283 * vec2<f32>(12f, 37f)), 37f);
    let _e294 = detailWeight(45f);
    scratches = ((_e280 * smoothstep(0.52f, 0.8f, _e289.x)) * _e294);
    let _e301 = paint;
    (*albedo_3) = (vec3<f32>(0.665f, 0.029f, 0.018f) * (1f + (_e301 * 0.055f)));
    let _e306 = (*albedo_3);
    let _e311 = abrasion;
    (*albedo_3) = mix(_e306, vec3<f32>(0.37f, 0.385f, 0.4f), vec3(_e311));
    let _e315 = paint;
    let _e319 = scratches;
    let _e323 = abrasion;
    (*rough_3) = (((0.31f + (_e315 * 0.04f)) + (_e319 * 0.13f)) + (_e323 * 0.12f));
    (*spec_3) = 0.28f;
    let _e329 = abrasion;
    (*layers_3).x = (_e329 * 0.9f);
    let _e335 = abrasion;
    (*layers_3).y = (0.3f * (1f - _e335));
    (*layers_3).z = 0.23f;
    let _e343 = abrasion;
    (*layers_3).y = (0.42f * (1f - _e343));
    let _e348 = scratches;
    (*layers_3).z = (0.205f + (_e348 * 0.14f));
    let _e352 = uv_10;
    let _e357 = microRelief(_e352, vec2<f32>(38f, 38f), 0.026f);
    (*relief_3) = _e357;
    let _e359 = (*relief_3);
    let _e361 = scratches;
    (*relief_3).x = (_e359.x + (_e361 * 0.009f));
    let _e369 = p_74;
    let _e371 = cubeScale();
    lower = (1f - smoothstep(-0.08f, 0.19f, (_e369.y / _e371)));
    let _e376 = uniforms;
    let _e379 = lower;
    slime = (_e376.uSurfaceContact.y * _e379);
    let _e382 = uniforms;
    let _e387 = slime;
    wet = max((_e382.uSurfaceContact.x * 0.8f), _e387);
    let _e390 = (*albedo_3);
    let _e395 = slime;
    (*albedo_3) = mix(_e390, vec3<f32>(0.41f, 0.075f, 0.49f), vec3((_e395 * 0.38f)));
    let _e400 = (*rough_3);
    let _e402 = wet;
    (*rough_3) = mix(_e400, 0.19f, (_e402 * 0.7f));
    let _e407 = (*layers_3);
    let _e410 = wet;
    (*layers_3).y = mix(_e407.y, 0.78f, _e410);
    let _e413 = (*layers_3);
    let _e416 = wet;
    (*layers_3).z = mix(_e413.z, 0.19f, _e416);
    return;
}

fn obstacleMaterial(m_23: f32, p_75: vec3<f32>, n_15: vec3<f32>, extent_23: vec3<f32>, seed_35: f32, worldPoint_8: vec3<f32>, zoneEdge_8: vec3<f32>, albedo_4: ptr<function, vec3<f32>>, rough_4: ptr<function, f32>, spec_4: ptr<function, f32>, emit_4: ptr<function, vec3<f32>>, layers_4: ptr<function, vec4<f32>>, relief_4: ptr<function, vec3<f32>>) {
    var m_24: f32;
    var p_76: vec3<f32>;
    var n_16: vec3<f32>;
    var extent_24: vec3<f32>;
    var seed_36: f32;
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
    seed_36 = seed_35;
    worldPoint_9 = worldPoint_8;
    zoneEdge_9 = zoneEdge_8;
    let _e222 = p_76;
    let _e223 = n_16;
    let _e224 = faceUV(_e222, _e223);
    uv_11 = _e224;
    let _e226 = p_76;
    let _e227 = extent_24;
    let _e228 = edgeMask(_e226, _e227);
    edge_1 = _e228;
    let _e230 = uv_11;
    let _e235 = seed_36;
    let _e239 = materialNoise(((_e230 * vec2<f32>(12f, 19f)) + vec2(_e235)), 19f);
    powder = (_e239.x - 0.5f);
    let _e246 = edge_1;
    let _e249 = uv_11;
    let _e252 = seed_36;
    let _e256 = materialNoise(((_e249 * 23f) + vec2(_e252)), 23f);
    wear = ((_e246 * smoothstep(0.48f, 0.83f, _e256.x)) * 0.4f);
    let _e267 = powder;
    let _e276 = wear;
    (*albedo_4) = mix((vec3<f32>(0.255f, 0.297f, 0.326f) * (1f + (_e267 * 0.03f))), vec3<f32>(0.44f, 0.46f, 0.48f), vec3(_e276));
    let _e280 = powder;
    let _e284 = wear;
    (*rough_4) = ((0.46f + (_e280 * 0.055f)) - (_e284 * 0.1f));
    (*spec_4) = 0.29f;
    let _e290 = wear;
    (*layers_4).x = (_e290 * 0.88f);
    let _e293 = uv_11;
    let _e298 = microRelief(_e293, vec2<f32>(7f, 49f), 0.021f);
    (*relief_4) = _e298;
    let _e302 = wear;
    (*layers_4).y = (0.12f * (1f - _e302));
    (*layers_4).z = 0.32f;
    return;
}

fn greenGoalMaterial(m_25: f32, p_77: vec3<f32>, n_17: vec3<f32>, extent_25: vec3<f32>, seed_37: f32, worldPoint_10: vec3<f32>, zoneEdge_10: vec3<f32>, albedo_5: ptr<function, vec3<f32>>, rough_5: ptr<function, f32>, spec_5: ptr<function, f32>, emit_5: ptr<function, vec3<f32>>, layers_5: ptr<function, vec4<f32>>, relief_5: ptr<function, vec3<f32>>) {
    var m_26: f32;
    var p_78: vec3<f32>;
    var n_18: vec3<f32>;
    var extent_26: vec3<f32>;
    var seed_38: f32;
    var worldPoint_11: vec3<f32>;
    var zoneEdge_11: vec3<f32>;
    var rim_1: f32;
    var symbol: f32;
    var top: f32;

    m_26 = m_25;
    p_78 = p_77;
    n_18 = n_17;
    extent_26 = extent_25;
    seed_38 = seed_37;
    worldPoint_11 = worldPoint_10;
    zoneEdge_11 = zoneEdge_10;
    let _e222 = p_78;
    let _e229 = filteredStripe((length(_e222.xz) - 0.425f), 2f, 0.035f);
    rim_1 = _e229;
    let _e231 = p_78;
    let _e238 = filteredStripe((length(_e231.xz) - 0.29f), 2f, 0.02f);
    symbol = _e238;
    let _e242 = n_18;
    top = smoothstep(0.25f, 0.75f, _e242.y);
    let _e254 = top;
    (*albedo_5) = mix(vec3<f32>(0.085f, 0.2f, 0.145f), vec3<f32>(0.06f, 0.75f, 0.29f), vec3(_e254));
    let _e261 = top;
    let _e264 = symbol;
    let _e268 = rim_1;
    (*emit_5) = ((vec3<f32>(0.035f, 0.95f, 0.25f) * _e261) * ((0.42f + (_e264 * 0.35f)) + (_e268 * 0.16f)));
    (*rough_5) = 0.37f;
    (*spec_5) = 0.25f;
    let _e275 = p_78;
    let _e281 = microRelief(_e275.xz, vec2<f32>(18f, 18f), 0.006f);
    (*relief_5) = _e281;
    return;
}

fn blueGoalMaterial(m_27: f32, p_79: vec3<f32>, n_19: vec3<f32>, extent_27: vec3<f32>, seed_39: f32, worldPoint_12: vec3<f32>, zoneEdge_12: vec3<f32>, albedo_6: ptr<function, vec3<f32>>, rough_6: ptr<function, f32>, spec_6: ptr<function, f32>, emit_6: ptr<function, vec3<f32>>, layers_6: ptr<function, vec4<f32>>, relief_6: ptr<function, vec3<f32>>) {
    var m_28: f32;
    var p_80: vec3<f32>;
    var n_20: vec3<f32>;
    var extent_28: vec3<f32>;
    var seed_40: f32;
    var worldPoint_13: vec3<f32>;
    var zoneEdge_13: vec3<f32>;
    var crossMark: f32;
    var top_1: f32;

    m_28 = m_27;
    p_80 = p_79;
    n_20 = n_19;
    extent_28 = extent_27;
    seed_40 = seed_39;
    worldPoint_13 = worldPoint_12;
    zoneEdge_13 = zoneEdge_12;
    let _e222 = p_80;
    let _e226 = filteredStripe(_e222.x, 2f, 0.035f);
    let _e227 = p_80;
    let _e231 = filteredStripe(_e227.z, 2f, 0.035f);
    crossMark = max(_e226, _e231);
    let _e236 = n_20;
    top_1 = smoothstep(0.25f, 0.75f, _e236.y);
    let _e248 = top_1;
    (*albedo_6) = mix(vec3<f32>(0.1f, 0.16f, 0.235f), vec3<f32>(0.12f, 0.4f, 0.89f), vec3(_e248));
    let _e255 = top_1;
    let _e258 = crossMark;
    (*emit_6) = ((vec3<f32>(0.045f, 0.28f, 1f) * _e255) * (0.44f + (_e258 * 0.34f)));
    (*rough_6) = 0.35f;
    (*spec_6) = 0.25f;
    let _e265 = p_80;
    let _e271 = microRelief(_e265.xz, vec2<f32>(18f, 18f), 0.006f);
    (*relief_6) = _e271;
    return;
}

fn ringMaterial(m_29: f32, p_81: vec3<f32>, n_21: vec3<f32>, extent_29: vec3<f32>, seed_41: f32, worldPoint_14: vec3<f32>, zoneEdge_14: vec3<f32>, albedo_7: ptr<function, vec3<f32>>, rough_7: ptr<function, f32>, spec_7: ptr<function, f32>, emit_7: ptr<function, vec3<f32>>, layers_7: ptr<function, vec4<f32>>, relief_7: ptr<function, vec3<f32>>) {
    var m_30: f32;
    var p_82: vec3<f32>;
    var n_22: vec3<f32>;
    var extent_30: vec3<f32>;
    var seed_42: f32;
    var worldPoint_15: vec3<f32>;
    var zoneEdge_15: vec3<f32>;
    var angle_1: f32;
    var charged: f32;
    var ticks: f32;

    m_30 = m_29;
    p_82 = p_81;
    n_22 = n_21;
    extent_30 = extent_29;
    seed_42 = seed_41;
    worldPoint_15 = worldPoint_14;
    zoneEdge_15 = zoneEdge_14;
    let _e222 = p_82;
    let _e226 = p_82;
    angle_1 = ((atan2((_e222.z + 0.00001f), (_e226.x + 0.00001f)) / 6.283185f) + 0.5f);
    let _e237 = uniforms;
    let _e242 = uniforms;
    let _e247 = angle_1;
    charged = (1f - smoothstep((_e237.uHold.x - 0.006f), (_e242.uHold.x + 0.006f), _e247));
    let _e251 = angle_1;
    let _e258 = filteredStripe((_e251 * 2.8274f), 0.117808335f, 0.015f);
    ticks = _e258;
    (*albedo_7) = vec3<f32>(0.88f, 0.63f, 0.12f);
    (*rough_7) = 0.39f;
    (*spec_7) = 0.25f;
    let _e271 = charged;
    let _e277 = ticks;
    (*emit_7) = ((vec3<f32>(1f, 0.53f, 0.035f) * (0.45f + (_e271 * 0.77f))) * (1f - (_e277 * 0.14f)));
    return;
}

fn lightMaterial(m_31: f32, p_83: vec3<f32>, n_23: vec3<f32>, extent_31: vec3<f32>, seed_43: f32, worldPoint_16: vec3<f32>, zoneEdge_16: vec3<f32>, albedo_8: ptr<function, vec3<f32>>, rough_8: ptr<function, f32>, spec_8: ptr<function, f32>, emit_8: ptr<function, vec3<f32>>, layers_8: ptr<function, vec4<f32>>, relief_8: ptr<function, vec3<f32>>) {
    var m_32: f32;
    var p_84: vec3<f32>;
    var n_24: vec3<f32>;
    var extent_32: vec3<f32>;
    var seed_44: f32;
    var worldPoint_17: vec3<f32>;
    var zoneEdge_17: vec3<f32>;

    m_32 = m_31;
    p_84 = p_83;
    n_24 = n_23;
    extent_32 = extent_31;
    seed_44 = seed_43;
    worldPoint_17 = worldPoint_16;
    zoneEdge_17 = zoneEdge_16;
    (*albedo_8) = vec3<f32>(0.95f, 0.88f, 0.73f);
    (*emit_8) = vec3<f32>(3.2f, 2.688f, 2.016f);
    (*rough_8) = 0.3f;
    (*spec_8) = 0.23f;
    return;
}

fn trimMaterial(m_33: f32, p_85: vec3<f32>, n_25: vec3<f32>, extent_33: vec3<f32>, seed_45: f32, worldPoint_18: vec3<f32>, zoneEdge_18: vec3<f32>, albedo_9: ptr<function, vec3<f32>>, rough_9: ptr<function, f32>, spec_9: ptr<function, f32>, emit_9: ptr<function, vec3<f32>>, layers_9: ptr<function, vec4<f32>>, relief_9: ptr<function, vec3<f32>>) {
    var m_34: f32;
    var p_86: vec3<f32>;
    var n_26: vec3<f32>;
    var extent_34: vec3<f32>;
    var seed_46: f32;
    var worldPoint_19: vec3<f32>;
    var zoneEdge_19: vec3<f32>;

    m_34 = m_33;
    p_86 = p_85;
    n_26 = n_25;
    extent_34 = extent_33;
    seed_46 = seed_45;
    worldPoint_19 = worldPoint_18;
    zoneEdge_19 = zoneEdge_18;
    (*albedo_9) = vec3<f32>(0.38f, 0.3f, 0.23f);
    (*rough_9) = 0.45f;
    (*spec_9) = 0.24f;
    (*layers_9).x = 0.75f;
    let _e230 = p_86;
    let _e231 = n_26;
    let _e232 = faceUV(_e230, _e231);
    let _e237 = microRelief(_e232, vec2<f32>(4f, 42f), 0.017f);
    (*relief_9) = _e237;
    return;
}

fn portalMaterial(m_35: f32, p_87: vec3<f32>, n_27: vec3<f32>, extent_35: vec3<f32>, seed_47: f32, worldPoint_20: vec3<f32>, zoneEdge_20: vec3<f32>, albedo_10: ptr<function, vec3<f32>>, rough_10: ptr<function, f32>, spec_10: ptr<function, f32>, emit_10: ptr<function, vec3<f32>>, layers_10: ptr<function, vec4<f32>>, relief_10: ptr<function, vec3<f32>>) {
    var m_36: f32;
    var p_88: vec3<f32>;
    var n_28: vec3<f32>;
    var extent_36: vec3<f32>;
    var seed_48: f32;
    var worldPoint_21: vec3<f32>;
    var zoneEdge_21: vec3<f32>;
    var local_45: f32;
    var frame: f32;

    m_36 = m_35;
    p_88 = p_87;
    n_28 = n_27;
    extent_36 = extent_35;
    seed_48 = seed_47;
    worldPoint_21 = worldPoint_20;
    zoneEdge_21 = zoneEdge_20;
    let _e222 = n_28;
    if (abs(_e222.y) > 0.5f) {
        local_45 = 0f;
    } else {
        let _e230 = p_88;
        let _e235 = p_88;
        local_45 = smoothstep(0.83f, 0.94f, max((abs(_e230.x) / 0.58f), (abs(_e235.y) / 0.7f)));
    }
    let _e243 = local_45;
    frame = _e243;
    let _e253 = frame;
    (*albedo_10) = mix(vec3<f32>(0.025f, 0.11f, 0.065f), vec3<f32>(0.13f, 0.25f, 0.19f), vec3(_e253));
    let _e258 = frame;
    (*rough_10) = mix(0.29f, 0.43f, _e258);
    (*spec_10) = 0.28f;
    let _e262 = frame;
    (*layers_10).x = (_e262 * 0.65f);
    (*emit_10) = vec3<f32>(0.025f, 0.9f, 0.37f);
    return;
}

fn iceMaterial(m_37: f32, p_89: vec3<f32>, n_29: vec3<f32>, extent_37: vec3<f32>, seed_49: f32, worldPoint_22: vec3<f32>, zoneEdge_22: vec3<f32>, albedo_11: ptr<function, vec3<f32>>, rough_11: ptr<function, f32>, spec_11: ptr<function, f32>, emit_11: ptr<function, vec3<f32>>, layers_11: ptr<function, vec4<f32>>, relief_11: ptr<function, vec3<f32>>) {
    var m_38: f32;
    var p_90: vec3<f32>;
    var n_30: vec3<f32>;
    var extent_38: vec3<f32>;
    var seed_50: f32;
    var worldPoint_23: vec3<f32>;
    var zoneEdge_23: vec3<f32>;
    var uv_12: vec2<f32>;
    var world: vec2<f32>;
    var delta: vec2<f32>;
    var time: f32;
    var radius_3: f32;
    var speed: f32;
    var local_46: vec2<f32>;
    var direction: vec2<f32>;
    var behind: f32;
    var side_4: f32;
    var contact: f32;
    var skid: f32;
    var wake: f32;
    var ripple: f32;
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
    seed_50 = seed_49;
    worldPoint_23 = worldPoint_22;
    zoneEdge_23 = zoneEdge_22;
    let _e222 = p_90;
    uv_12 = _e222.xz;
    let _e225 = worldPoint_23;
    world = _e225.xz;
    let _e228 = world;
    let _e229 = uniforms;
    delta = (_e228 - _e229.uCube.xy);
    let _e234 = effectTime();
    time = _e234;
    let _e236 = delta;
    radius_3 = length(_e236);
    let _e239 = uniforms;
    speed = min(length(_e239.uCubeVelocity.xy), 4f);
    let _e246 = uniforms;
    if (length(_e246.uCubeVelocity.xy) > 0.001f) {
        let _e252 = uniforms;
        local_46 = normalize(_e252.uCubeVelocity.xy);
    } else {
        local_46 = vec2<f32>(1f, 0f);
    }
    let _e262 = local_46;
    direction = _e262;
    let _e264 = delta;
    let _e265 = direction;
    behind = -(dot(_e264, _e265));
    let _e269 = delta;
    let _e270 = direction;
    let _e273 = direction;
    side_4 = dot(_e269, vec2<f32>(-(_e270.y), _e273.x));
    let _e278 = uniforms;
    let _e281 = uniforms;
    let _e285 = uniforms;
    contact = ((_e278.uSurfaceContact.x * _e281.uSurfaceContact.z) * _e285.uLook.w);
    let _e290 = uniforms;
    skid = _e290.uSurfaceContact.w;
    let _e294 = side_4;
    let _e296 = side_4;
    let _e303 = behind;
    let _e309 = behind;
    let _e313 = contact;
    let _e315 = speed;
    wake = (((((exp(((-(_e294) * _e296) * 22f)) * smoothstep(0f, 0.22f, _e303)) * (1f - smoothstep(0.25f, 1.25f, _e309))) * _e313) * _e315) * 0.25f);
    let _e320 = radius_3;
    let _e323 = time;
    let _e328 = radius_3;
    let _e340 = radius_3;
    let _e343 = contact;
    ripple = (((sin(((_e320 * 24f) - (_e323 * 5f))) * exp((-(max((_e328 - 0.24f), 0f)) * 3f))) * smoothstep(0.2f, 0.34f, _e340)) * _e343);
    let _e346 = uv_12;
    let _e349 = time;
    let _e352 = time;
    let _e358 = seed_50;
    let _e362 = materialNoise((((_e346 * 3.4f) + vec2<f32>((_e349 * 0.12f), (-(_e352) * 0.08f))) + vec2(_e358)), 3.4f);
    swell = _e362;
    let _e367 = zoneEdge_23;
    meniscus = (1f - smoothstep(0.008f, 0.075f, _e367.x));
    let _e374 = radius_3;
    let _e377 = time;
    let _e383 = radius_3;
    let _e393 = contact;
    crest = ((smoothstep(0.55f, 0.93f, sin(((_e374 * 24f) - (_e377 * 5f)))) * exp((-(max((_e383 - 0.3f), 0f)) * 2.5f))) * _e393);
    let _e397 = behind;
    spread = (0.16f + (max(_e397, 0f) * 0.3f));
    let _e404 = side_4;
    let _e406 = spread;
    foamSide = ((abs(_e404) - _e406) * 11f);
    let _e411 = foamSide;
    let _e413 = foamSide;
    let _e418 = behind;
    let _e424 = behind;
    let _e428 = contact;
    let _e430 = speed;
    let _e433 = skid;
    foam = ((((exp((-(_e411) * _e413)) * smoothstep(0f, 0.2f, _e418)) * (1f - smoothstep(0.4f, 1.5f, _e424))) * _e428) * ((_e430 * 0.22f) + (_e433 * 0.75f)));
    let _e447 = swell;
    let _e451 = meniscus;
    (*albedo_11) = mix(vec3<f32>(0.025f, 0.24f, 0.37f), vec3<f32>(0.1f, 0.55f, 0.65f), vec3(((_e447.x * 0.45f) + (_e451 * 0.3f))));
    let _e457 = (*albedo_11);
    let _e462 = foam;
    let _e465 = crest;
    let _e466 = speed;
    let _e469 = skid;
    (*albedo_11) = mix(_e457, vec3<f32>(0.72f, 0.91f, 0.93f), vec3(clamp(((_e462 * 0.8f) + (_e465 * ((_e466 * 0.1f) + (_e469 * 0.22f)))), 0f, 0.8f)));
    let _e482 = swell;
    (*rough_11) = (0.18f + (0.015f * _e482.x));
    (*spec_11) = 0.42f;
    (*layers_11).y = 0.94f;
    (*layers_11).z = 0.18f;
    let _e491 = swell;
    let _e494 = (_e491.yz * 0.105f);
    (*relief_11) = vec3<f32>(_e494.x, _e494.y, 0f);
    let _e499 = (*relief_11);
    let _e501 = (*relief_11);
    let _e503 = delta;
    let _e504 = radius_3;
    let _e509 = ripple;
    let _e512 = skid;
    let _e517 = direction;
    let _e520 = direction;
    let _e523 = wake;
    let _e525 = side_4;
    let _e533 = (_e501.xy + ((((_e503 / vec2(max(_e504, 0.03f))) * _e509) * (0.1f + (_e512 * 0.12f))) + (((vec2<f32>(-(_e517.y), _e520.x) * _e523) * sin((_e525 * 20f))) * 0.21f)));
    (*relief_11).x = _e533.x;
    (*relief_11).y = _e533.y;
    let _e538 = (*relief_11);
    let _e540 = (*relief_11);
    let _e542 = zoneEdge_23;
    let _e544 = meniscus;
    let _e548 = (_e540.xy + ((_e542.yz * _e544) * 0.18f));
    (*relief_11).x = _e548.x;
    (*relief_11).y = _e548.y;
    return;
}

fn brakeMaterial(m_39: f32, p_91: vec3<f32>, n_31: vec3<f32>, extent_39: vec3<f32>, seed_51: f32, worldPoint_24: vec3<f32>, zoneEdge_24: vec3<f32>, albedo_12: ptr<function, vec3<f32>>, rough_12: ptr<function, f32>, spec_12: ptr<function, f32>, emit_12: ptr<function, vec3<f32>>, layers_12: ptr<function, vec4<f32>>, relief_12: ptr<function, vec3<f32>>) {
    var m_40: f32;
    var p_92: vec3<f32>;
    var n_32: vec3<f32>;
    var extent_40: vec3<f32>;
    var seed_52: f32;
    var worldPoint_25: vec3<f32>;
    var zoneEdge_25: vec3<f32>;
    var uv_13: vec2<f32>;
    var world_1: vec2<f32>;
    var delta_1: vec2<f32>;
    var time_1: f32;
    var speed_1: f32;
    var pull: vec2<f32>;
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
    seed_52 = seed_51;
    worldPoint_25 = worldPoint_24;
    zoneEdge_25 = zoneEdge_24;
    let _e222 = p_92;
    uv_13 = _e222.xz;
    let _e225 = worldPoint_25;
    world_1 = _e225.xz;
    let _e228 = world_1;
    let _e229 = uniforms;
    delta_1 = (_e228 - _e229.uCube.xy);
    let _e234 = effectTime();
    time_1 = _e234;
    let _e236 = uniforms;
    speed_1 = min(length(_e236.uCubeVelocity.xy), 3f);
    let _e243 = uniforms;
    let _e248 = uniforms;
    pull = ((_e243.uCubeVelocity.xy * 0.055f) * _e248.uSurfaceContact.z);
    let _e253 = uv_13;
    let _e254 = pull;
    let _e258 = seed_52;
    let _e261 = time_1;
    let _e267 = time_1;
    let _e276 = materialNoise(((((_e253 - _e254) * 5.2f) + vec2(_e258)) + vec2<f32>((sin((_e261 * 0.32f)) * 0.09f), (cos((_e267 * 0.27f)) * 0.07f))), 5.2f);
    lobes = _e276;
    let _e281 = zoneEdge_25;
    rim_2 = (1f - smoothstep(0.008f, 0.13f, _e281.x));
    let _e286 = delta_1;
    radius_4 = length(_e286);
    let _e289 = radius_4;
    separation = ((_e289 - 0.28f) / 0.11f);
    let _e295 = separation;
    let _e297 = separation;
    let _e300 = uniforms;
    let _e304 = uniforms;
    adhesion = ((exp((-(_e295) * _e297)) * _e300.uSurfaceContact.y) * _e304.uSurfaceContact.z);
    let _e313 = uv_13;
    let _e316 = seed_52;
    let _e320 = materialNoise(((_e313 * 19f) + vec2(_e316)), 19f);
    let _e324 = detailWeight(19f);
    bubble = (smoothstep(0.77f, 0.88f, _e320.x) * _e324);
    let _e326 = uniforms;
    stretchLength = length(_e326.uStickyStretch.xy);
    let _e331 = delta_1;
    let _e332 = uniforms;
    let _e336 = uniforms;
    let _e339 = uniforms;
    along_2 = clamp((dot(_e331, _e332.uStickyStretch.xy) / max(dot(_e336.uStickyStretch.xy, _e339.uStickyStretch.xy), 0.001f)), 0f, 1f);
    let _e350 = delta_1;
    let _e351 = uniforms;
    let _e354 = along_2;
    tether = (_e350 - (_e351.uStickyStretch.xy * _e354));
    let _e358 = tether;
    let _e359 = tether;
    let _e367 = stretchLength;
    let _e370 = uniforms;
    let _e374 = uniforms;
    pullRidge = (((exp((-(dot(_e358, _e359)) * 90f)) * smoothstep(0.04f, 0.25f, _e367)) * _e370.uSurfaceContact.y) * _e374.uSurfaceContact.z);
    let _e389 = lobes;
    (*albedo_12) = mix(vec3<f32>(0.2f, 0.014f, 0.33f), vec3<f32>(0.67f, 0.075f, 0.83f), vec3(smoothstep(0.22f, 0.78f, _e389.x)));
    let _e394 = (*albedo_12);
    let _e399 = rim_2;
    let _e402 = bubble;
    let _e406 = pullRidge;
    (*albedo_12) = mix(_e394, vec3<f32>(0.75f, 0.32f, 0.89f), vec3((((_e399 * 0.28f) + (_e402 * 0.34f)) + (_e406 * 0.2f))));
    let _e415 = lobes;
    (*rough_12) = (0.205f + (0.045f * (1f - _e415.x)));
    (*spec_12) = 0.42f;
    (*layers_12).y = 0.96f;
    (*layers_12).z = 0.18f;
    let _e425 = lobes;
    let _e434 = clamp((_e425.yz * 0.46f), vec2(-0.42f), vec2(0.42f));
    (*relief_12) = vec3<f32>(_e434.x, _e434.y, 0f);
    let _e439 = (*relief_12);
    let _e441 = (*relief_12);
    let _e443 = zoneEdge_25;
    let _e445 = rim_2;
    let _e449 = delta_1;
    let _e450 = radius_4;
    let _e455 = adhesion;
    let _e458 = speed_1;
    let _e464 = (_e441.xy + (((_e443.yz * _e445) * 0.29f) + (((_e449 / vec2(max(_e450, 0.03f))) * _e455) * (0.3f + (_e458 * 0.06f)))));
    (*relief_12).x = _e464.x;
    (*relief_12).y = _e464.y;
    let _e469 = (*relief_12);
    let _e471 = (*relief_12);
    let _e473 = uniforms;
    let _e476 = stretchLength;
    let _e481 = pullRidge;
    let _e485 = (_e471.xy + (((_e473.uStickyStretch.xy / vec2(max(_e476, 0.04f))) * _e481) * 0.28f));
    (*relief_12).x = _e485.x;
    (*relief_12).y = _e485.y;
    let _e494 = adhesion;
    let _e497 = pullRidge;
    (*emit_12) = (vec3<f32>(0.19f, 0.006f, 0.27f) * ((_e494 * 0.06f) + (_e497 * 0.035f)));
    return;
}

fn boostMaterial(m_41: f32, p_93: vec3<f32>, n_33: vec3<f32>, extent_41: vec3<f32>, seed_53: f32, worldPoint_26: vec3<f32>, zoneEdge_26: vec3<f32>, albedo_13: ptr<function, vec3<f32>>, rough_13: ptr<function, f32>, spec_13: ptr<function, f32>, emit_13: ptr<function, vec3<f32>>, layers_13: ptr<function, vec4<f32>>, relief_13: ptr<function, vec3<f32>>) {
    var m_42: f32;
    var p_94: vec3<f32>;
    var n_34: vec3<f32>;
    var extent_42: vec3<f32>;
    var seed_54: f32;
    var worldPoint_27: vec3<f32>;
    var zoneEdge_27: vec3<f32>;
    var current: vec4<f32>;
    var local_47: vec2<f32>;
    var dir_2: vec2<f32>;
    var crossFlow: vec2<f32>;
    var transported: vec2<f32>;
    var uv_14: vec2<f32>;
    var dunes: vec3<f32>;
    var grains: vec3<f32>;
    var ripple_1: f32;
    var strata: f32;
    var slope_3: vec2<f32>;

    m_42 = m_41;
    p_94 = p_93;
    n_34 = n_33;
    extent_42 = extent_41;
    seed_54 = seed_53;
    worldPoint_27 = worldPoint_26;
    zoneEdge_27 = zoneEdge_26;
    let _e222 = seed_54;
    let _e223 = zoneFlow(_e222);
    current = _e223;
    let _e225 = current;
    let _e227 = current;
    if (dot(_e225.xy, _e227.xy) > 0.01f) {
        let _e232 = current;
        local_47 = _e232.xy;
    } else {
        local_47 = vec2<f32>(1f, 0f);
    }
    let _e240 = local_47;
    dir_2 = _e240;
    let _e242 = dir_2;
    let _e245 = dir_2;
    crossFlow = vec2<f32>(-(_e242.y), _e245.x);
    let _e249 = p_94;
    let _e251 = dir_2;
    let _e252 = uniforms;
    let _e256 = current;
    transported = (_e249.xz - ((_e251 * _e252.uTime.x) * _e256.z));
    let _e261 = transported;
    let _e262 = dir_2;
    let _e264 = transported;
    let _e265 = crossFlow;
    uv_14 = vec2<f32>(dot(_e261, _e262), dot(_e264, _e265));
    let _e269 = uv_14;
    let _e274 = seed_54;
    let _e278 = materialNoise(((_e269 * vec2<f32>(3.2f, 8f)) + vec2(_e274)), 8f);
    dunes = _e278;
    let _e280 = uv_14;
    let _e283 = seed_54;
    let _e287 = materialNoise(((_e280 * 31f) + vec2(_e283)), 31f);
    grains = _e287;
    let _e291 = uv_14;
    let _e295 = dunes;
    ripple_1 = (0.5f + (0.5f * sin(((_e291.x * 18f) + (_e295.x * 3f)))));
    let _e305 = ripple_1;
    let _e308 = uniforms;
    strata = mix(0.5f, _e305, (0.42f + (0.33f * _e308.uLook.w)));
    let _e324 = strata;
    let _e328 = grains;
    let _e334 = uniforms;
    (*albedo_13) = mix(vec3<f32>(0.4f, 0.23f, 0.075f), vec3<f32>(0.94f, 0.71f, 0.36f), vec3(((0.25f + (_e324 * 0.5f)) + ((_e328.x - 0.5f) * (0.3f + (0.35f * _e334.uLook.w))))));
    let _e343 = (*albedo_13);
    let _e350 = grains;
    let _e354 = uniforms;
    (*albedo_13) = (_e343 + ((vec3<f32>(0.1f, 0.075f, 0.025f) * smoothstep(0.68f, 0.88f, _e350.x)) * _e354.uLook.w));
    let _e360 = grains;
    (*rough_13) = (0.79f + ((_e360.x - 0.5f) * 0.12f));
    (*spec_13) = 0.17f;
    let _e368 = uv_14;
    let _e372 = dunes;
    let _e380 = dunes;
    let _e385 = grains;
    let _e389 = uniforms;
    slope_3 = (vec2<f32>((cos(((_e368.x * 18f) + (_e372.x * 3f))) * 0.16f), (_e380.z * 0.13f)) + (_e385.yz * (0.035f + (0.055f * _e389.uLook.w))));
    let _e397 = dir_2;
    let _e398 = slope_3;
    let _e401 = crossFlow;
    let _e402 = slope_3;
    let _e405 = ((_e397 * _e398.x) + (_e401 * _e402.y));
    (*relief_13) = vec3<f32>(_e405.x, _e405.y, 0.001f);
    return;
}

fn platformMaterial(m_43: f32, p_95: vec3<f32>, n_35: vec3<f32>, extent_43: vec3<f32>, seed_55: f32, worldPoint_28: vec3<f32>, zoneEdge_28: vec3<f32>, albedo_14: ptr<function, vec3<f32>>, rough_14: ptr<function, f32>, spec_14: ptr<function, f32>, emit_14: ptr<function, vec3<f32>>, layers_14: ptr<function, vec4<f32>>, relief_14: ptr<function, vec3<f32>>) {
    var m_44: f32;
    var p_96: vec3<f32>;
    var n_36: vec3<f32>;
    var extent_44: vec3<f32>;
    var seed_56: f32;
    var worldPoint_29: vec3<f32>;
    var zoneEdge_29: vec3<f32>;
    var alongZ: bool;
    var uv_15: vec2<f32>;
    var identity_3: f32;
    var slope_4: vec2<f32>;
    var tissue_1: vec4<f32>;
    var side_5: f32;
    var local_48: f32;
    var endGrain: f32;
    var local_49: vec2<f32>;
    var endUV: vec2<f32>;
    var cut: f32;
    var growth: f32;
    var lamination: f32;

    m_44 = m_43;
    p_96 = p_95;
    n_36 = n_35;
    extent_44 = extent_43;
    seed_56 = seed_55;
    worldPoint_29 = worldPoint_28;
    zoneEdge_29 = zoneEdge_28;
    let _e222 = extent_44;
    let _e224 = extent_44;
    alongZ = (_e222.z >= _e224.x);
    let _e228 = p_96;
    let _e229 = n_36;
    let _e230 = faceUV(_e228, _e229);
    uv_15 = _e230;
    let _e232 = n_36;
    let _e237 = alongZ;
    if ((abs(_e232.y) > 0.5f) && !(_e237)) {
        let _e240 = uv_15;
        uv_15 = _e240.yx;
    }
    let _e242 = seed_56;
    let _e245 = hash(vec2<f32>(_e242, 3.2f));
    identity_3 = _e245;
    let _e248 = uv_15;
    let _e249 = identity_3;
    let _e255 = identity_3;
    let _e258 = woodAnatomy((_e248 + vec2<f32>((_e249 * 0.21f), 0f)), _e255, (&slope_4));
    tissue_1 = _e258;
    let _e263 = n_36;
    side_5 = (1f - smoothstep(0.4f, 0.9f, abs(_e263.y)));
    let _e269 = side_5;
    let _e270 = alongZ;
    if _e270 {
        let _e271 = n_36;
        local_48 = abs(_e271.z);
    } else {
        let _e274 = n_36;
        local_48 = abs(_e274.x);
    }
    let _e278 = local_48;
    endGrain = (_e269 * _e278);
    let _e281 = alongZ;
    if _e281 {
        let _e282 = p_96;
        local_49 = _e282.xy;
    } else {
        let _e284 = p_96;
        local_49 = _e284.zy;
    }
    let _e287 = local_49;
    endUV = _e287;
    let _e289 = endUV;
    let _e297 = identity_3;
    let _e303 = woodRingFilter(((length((_e289 * vec2<f32>(1f, 1.8f))) * 25f) + (_e297 * 3f)), 45f, 0.24f);
    cut = _e303;
    let _e305 = tissue_1;
    let _e307 = cut;
    let _e308 = endGrain;
    growth = mix(_e305.x, _e307, _e308);
    let _e311 = p_96;
    let _e313 = extent_44;
    let _e318 = filteredStripe((_e311.y + _e313.y), 0.09f, 0.004f);
    let _e319 = side_5;
    lamination = (_e318 * _e319);
    let _e330 = identity_3;
    let _e334 = growth;
    let _e340 = tissue_1;
    let _e345 = tissue_1;
    let _e350 = tissue_1;
    let _e355 = lamination;
    (*albedo_14) = (mix(vec3<f32>(0.55f, 0.355f, 0.188f), vec3<f32>(0.63f, 0.418f, 0.236f), vec3(_e330)) * (((((1f - ((_e334 - 0.19f) * 0.23f)) + (_e340.y * 0.07f)) + (_e345.w * 0.12f)) - (_e350.z * 0.16f)) - (_e355 * 0.1f)));
    let _e361 = growth;
    let _e365 = tissue_1;
    let _e370 = endGrain;
    (*rough_14) = (((0.585f + (_e361 * 0.025f)) + (_e365.z * 0.055f)) + (_e370 * 0.035f));
    (*spec_14) = 0.2f;
    let _e375 = uv_15;
    let _e380 = microRelief(_e375, vec2<f32>(25f, 4f), 0.018f);
    (*relief_14) = _e380;
    let _e381 = (*relief_14);
    let _e383 = (*relief_14);
    let _e385 = slope_4;
    let _e387 = endGrain;
    let _e390 = (_e383.xy + (_e385 * (1f - _e387)));
    (*relief_14).x = _e390.x;
    (*relief_14).y = _e390.y;
    let _e395 = n_36;
    let _e400 = alongZ;
    if ((abs(_e395.y) > 0.5f) && !(_e400)) {
        let _e403 = (*relief_14);
        let _e405 = (*relief_14);
        let _e406 = _e405.yx;
        (*relief_14).x = _e406.x;
        (*relief_14).y = _e406.y;
        return;
    } else {
        return;
    }
}

fn jumpMaterial(m_45: f32, p_97: vec3<f32>, n_37: vec3<f32>, extent_45: vec3<f32>, seed_57: f32, worldPoint_30: vec3<f32>, zoneEdge_30: vec3<f32>, albedo_15: ptr<function, vec3<f32>>, rough_15: ptr<function, f32>, spec_15: ptr<function, f32>, emit_15: ptr<function, vec3<f32>>, layers_15: ptr<function, vec4<f32>>, relief_15: ptr<function, vec3<f32>>) {
    var m_46: f32;
    var p_98: vec3<f32>;
    var n_38: vec3<f32>;
    var extent_46: vec3<f32>;
    var seed_58: f32;
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
    seed_58 = seed_57;
    worldPoint_31 = worldPoint_30;
    zoneEdge_31 = zoneEdge_30;
    let _e222 = seed_58;
    let _e223 = zoneMotionAt(_e222);
    spring = _e223;
    let _e225 = p_98;
    let _e228 = extent_46;
    radial = (length(_e225.xz) / max(_e228.x, 0.01f));
    let _e234 = spring;
    strain = max(_e234.x, 0f);
    let _e241 = radial;
    shoulder = smoothstep(0.52f, 0.96f, _e241);
    let _e244 = p_98;
    let _e249 = filteredStripe(length(_e244.xz), 0.105f, 0.007f);
    ribs = _e249;
    let _e251 = radial;
    let _e254 = effectTime();
    let _e259 = spring;
    let _e267 = uniforms;
    pulse = ((sin(((_e251 * 18f) - (_e254 * 10f))) * min((abs(_e259.y) * 0.15f), 1f)) * _e267.uLook.w);
    let _e281 = shoulder;
    (*albedo_15) = mix(vec3<f32>(0.035f, 0.34f, 0.38f), vec3<f32>(0.12f, 0.77f, 0.8f), vec3((1f - (_e281 * 0.72f))));
    let _e287 = (*albedo_15);
    let _e289 = ribs;
    (*albedo_15) = (_e287 * (1f - (_e289 * 0.1f)));
    let _e294 = (*albedo_15);
    let _e299 = strain;
    let _e302 = pulse;
    (*albedo_15) = (_e294 + (vec3<f32>(0.06f, 0.13f, 0.12f) * ((_e299 * 0.7f) + (_e302 * 0.08f))));
    (*rough_15) = 0.43f;
    (*spec_15) = 0.3f;
    (*layers_15).y = 0.32f;
    (*layers_15).z = 0.28f;
    let _e314 = p_98;
    let _e316 = p_98;
    let _e323 = pulse;
    let _e326 = (((_e314.xz / vec2(max(length(_e316.xz), 0.03f))) * _e323) * 0.035f);
    (*relief_15) = vec3<f32>(_e326.x, _e326.y, 0f);
    let _e335 = strain;
    (*emit_15) = ((vec3<f32>(0.015f, 0.22f, 0.24f) * _e335) * 0.12f);
    return;
}

fn bumperMaterial(m_47: f32, p_99: vec3<f32>, n_39: vec3<f32>, extent_47: vec3<f32>, seed_59: f32, worldPoint_32: vec3<f32>, zoneEdge_32: vec3<f32>, albedo_16: ptr<function, vec3<f32>>, rough_16: ptr<function, f32>, spec_16: ptr<function, f32>, emit_16: ptr<function, vec3<f32>>, layers_16: ptr<function, vec4<f32>>, relief_16: ptr<function, vec3<f32>>) {
    var m_48: f32;
    var p_100: vec3<f32>;
    var n_40: vec3<f32>;
    var extent_48: vec3<f32>;
    var seed_60: f32;
    var worldPoint_33: vec3<f32>;
    var zoneEdge_33: vec3<f32>;
    var uv_16: vec2<f32>;
    var jelly: vec4<f32>;
    var body: f32;
    var bubbles: f32;
    var base: f32;

    m_48 = m_47;
    p_100 = p_99;
    n_40 = n_39;
    extent_48 = extent_47;
    seed_60 = seed_59;
    worldPoint_33 = worldPoint_32;
    zoneEdge_33 = zoneEdge_32;
    let _e222 = p_100;
    let _e223 = n_40;
    let _e224 = faceUV(_e222, _e223);
    uv_16 = _e224;
    let _e226 = seed_60;
    let _e227 = jellyState(_e226);
    jelly = _e227;
    let _e229 = uv_16;
    let _e232 = seed_60;
    let _e236 = materialNoise(((_e229 * 4.5f) + vec2(_e232)), 4.5f);
    body = _e236.x;
    let _e241 = uv_16;
    let _e244 = seed_60;
    let _e248 = materialNoise(((_e241 * 22f) + vec2(_e244)), 22f);
    let _e252 = detailWeight(22f);
    bubbles = (smoothstep(0.75f, 0.9f, _e248.x) * _e252);
    let _e256 = extent_48;
    let _e259 = extent_48;
    let _e264 = p_100;
    base = (1f - smoothstep(-(_e256.y), (-(_e259.y) + 0.06f), _e264.y));
    let _e277 = body;
    let _e280 = bubbles;
    (*albedo_16) = mix(vec3<f32>(0.62f, 0.025f, 0.018f), vec3<f32>(0.91f, 0.15f, 0.065f), vec3(((_e277 * 0.55f) + (_e280 * 0.22f))));
    let _e286 = (*albedo_16);
    let _e288 = base;
    (*albedo_16) = (_e286 * (1f - (_e288 * 0.22f)));
    let _e294 = body;
    (*rough_16) = (0.205f + (_e294 * 0.055f));
    (*spec_16) = 0.37f;
    (*layers_16).y = 0.78f;
    (*layers_16).z = 0.185f;
    let _e303 = uv_16;
    let _e308 = microRelief(_e303, vec2<f32>(7f, 7f), 0.006f);
    (*relief_16) = _e308;
    let _e309 = (*albedo_16);
    let _e314 = jelly;
    let _e322 = uniforms;
    (*albedo_16) = (_e309 + ((vec3<f32>(0.08f, 0.018f, 0.012f) * min((abs(_e314.y) * 0.2f), 1f)) * _e322.uLook.w));
    return;
}

fn surfaceMaterial(m_49: f32, p_101: vec3<f32>, geometric: vec3<f32>, albedo_17: ptr<function, vec3<f32>>, rough_17: ptr<function, f32>, spec_17: ptr<function, f32>, emit_17: ptr<function, vec3<f32>>, layers_17: ptr<function, vec4<f32>>, normal_3: ptr<function, vec3<f32>>) {
    var m_50: f32;
    var p_102: vec3<f32>;
    var geometric_1: vec3<f32>;
    var q_17: vec3<f32>;
    var extent_49: vec3<f32>;
    var relief_17: vec3<f32> = vec3(0f);
    var ng: vec3<f32>;
    var seed_61: f32;
    var edge_2: vec3<f32> = vec3<f32>(1f, 0f, 0f);
    var cube: bool;
    var a_8: vec3<f32>;
    var t_6: vec3<f32>;
    var b_11: vec3<f32>;
    var slope_5: vec3<f32>;
    var gradient_4: vec3<f32>;
    var paint_1: vec4<f32>;

    m_50 = m_49;
    p_102 = p_101;
    geometric_1 = geometric;
    let _e220 = geometric_1;
    ng = _e220;
    let _e223 = m_50;
    let _e224 = p_102;
    materialCoordinates(_e223, _e224, (&q_17), (&extent_49), (&seed_61));
    let _e239 = m_50;
    let _e242 = m_50;
    if ((_e239 > 15.5f) && (_e242 < 17.5f)) {
        let _e246 = q_17;
        let _e248 = extent_49;
        let _e249 = seed_61;
        let _e250 = zoneEdgeInfo(_e246.xz, _e248, _e249);
        edge_2 = _e250;
    }
    let _e251 = m_50;
    let _e254 = m_50;
    cube = ((_e251 > 6.5f) && (_e254 < 7.5f));
    let _e259 = cube;
    if _e259 {
        let _e260 = uniforms;
        let _e263 = -(_e260.uCubeQ.xyz);
        let _e264 = uniforms;
        let _e271 = geometric_1;
        let _e272 = qrot(vec4<f32>(_e263.x, _e263.y, _e263.z, _e264.uCubeQ.w), _e271);
        ng = _e272;
    }
    (*albedo_17) = vec3(0.65f);
    (*rough_17) = 0.65f;
    (*spec_17) = 0.2f;
    (*emit_17) = vec3(0f);
    (*layers_17) = vec4<f32>(0f, 0f, 0.3f, 0f);
    let _e288 = m_50;
    if (_e288 < 1.5f) {
        let _e291 = m_50;
        let _e292 = q_17;
        let _e293 = ng;
        let _e294 = extent_49;
        let _e295 = seed_61;
        let _e296 = p_102;
        let _e297 = edge_2;
        woodMaterial(_e291, _e292, _e293, _e294, _e295, _e296, _e297, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
    } else {
        let _e310 = m_50;
        if (_e310 < 2.5f) {
            let _e313 = m_50;
            let _e314 = q_17;
            let _e315 = ng;
            let _e316 = extent_49;
            let _e317 = seed_61;
            let _e318 = p_102;
            let _e319 = edge_2;
            carpetMaterial(_e313, _e314, _e315, _e316, _e317, _e318, _e319, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
        } else {
            let _e332 = m_50;
            if (_e332 < 6.5f) {
                let _e335 = m_50;
                let _e336 = q_17;
                let _e337 = ng;
                let _e338 = extent_49;
                let _e339 = seed_61;
                let _e340 = p_102;
                let _e341 = edge_2;
                wallMaterial(_e335, _e336, _e337, _e338, _e339, _e340, _e341, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
            } else {
                let _e354 = m_50;
                if (_e354 < 7.5f) {
                    let _e357 = m_50;
                    let _e358 = q_17;
                    let _e359 = ng;
                    let _e360 = extent_49;
                    let _e361 = seed_61;
                    let _e362 = p_102;
                    let _e363 = edge_2;
                    cubeMaterial(_e357, _e358, _e359, _e360, _e361, _e362, _e363, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                } else {
                    let _e376 = m_50;
                    if (_e376 < 8.5f) {
                        let _e379 = m_50;
                        let _e380 = q_17;
                        let _e381 = ng;
                        let _e382 = extent_49;
                        let _e383 = seed_61;
                        let _e384 = p_102;
                        let _e385 = edge_2;
                        obstacleMaterial(_e379, _e380, _e381, _e382, _e383, _e384, _e385, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                    } else {
                        let _e398 = m_50;
                        if (_e398 < 10.5f) {
                            let _e401 = m_50;
                            let _e402 = q_17;
                            let _e403 = ng;
                            let _e404 = extent_49;
                            let _e405 = seed_61;
                            let _e406 = p_102;
                            let _e407 = edge_2;
                            greenGoalMaterial(_e401, _e402, _e403, _e404, _e405, _e406, _e407, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                        } else {
                            let _e420 = m_50;
                            if (_e420 < 11.5f) {
                                let _e423 = m_50;
                                let _e424 = q_17;
                                let _e425 = ng;
                                let _e426 = extent_49;
                                let _e427 = seed_61;
                                let _e428 = p_102;
                                let _e429 = edge_2;
                                blueGoalMaterial(_e423, _e424, _e425, _e426, _e427, _e428, _e429, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                            } else {
                                let _e442 = m_50;
                                if (_e442 < 12.5f) {
                                    let _e445 = m_50;
                                    let _e446 = q_17;
                                    let _e447 = ng;
                                    let _e448 = extent_49;
                                    let _e449 = seed_61;
                                    let _e450 = p_102;
                                    let _e451 = edge_2;
                                    ringMaterial(_e445, _e446, _e447, _e448, _e449, _e450, _e451, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                } else {
                                    let _e464 = m_50;
                                    if (_e464 < 13.5f) {
                                        let _e467 = m_50;
                                        let _e468 = q_17;
                                        let _e469 = ng;
                                        let _e470 = extent_49;
                                        let _e471 = seed_61;
                                        let _e472 = p_102;
                                        let _e473 = edge_2;
                                        lightMaterial(_e467, _e468, _e469, _e470, _e471, _e472, _e473, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                    } else {
                                        let _e486 = m_50;
                                        if (_e486 < 14.5f) {
                                            let _e489 = m_50;
                                            let _e490 = q_17;
                                            let _e491 = ng;
                                            let _e492 = extent_49;
                                            let _e493 = seed_61;
                                            let _e494 = p_102;
                                            let _e495 = edge_2;
                                            trimMaterial(_e489, _e490, _e491, _e492, _e493, _e494, _e495, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                        } else {
                                            let _e508 = m_50;
                                            if (_e508 < 15.5f) {
                                                let _e511 = m_50;
                                                let _e512 = q_17;
                                                let _e513 = ng;
                                                let _e514 = extent_49;
                                                let _e515 = seed_61;
                                                let _e516 = p_102;
                                                let _e517 = edge_2;
                                                portalMaterial(_e511, _e512, _e513, _e514, _e515, _e516, _e517, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                            } else {
                                                let _e530 = m_50;
                                                if (_e530 < 16.5f) {
                                                    let _e533 = m_50;
                                                    let _e534 = q_17;
                                                    let _e535 = ng;
                                                    let _e536 = extent_49;
                                                    let _e537 = seed_61;
                                                    let _e538 = p_102;
                                                    let _e539 = edge_2;
                                                    iceMaterial(_e533, _e534, _e535, _e536, _e537, _e538, _e539, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                } else {
                                                    let _e552 = m_50;
                                                    if (_e552 < 17.5f) {
                                                        let _e555 = m_50;
                                                        let _e556 = q_17;
                                                        let _e557 = ng;
                                                        let _e558 = extent_49;
                                                        let _e559 = seed_61;
                                                        let _e560 = p_102;
                                                        let _e561 = edge_2;
                                                        brakeMaterial(_e555, _e556, _e557, _e558, _e559, _e560, _e561, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                    } else {
                                                        let _e574 = m_50;
                                                        if (_e574 < 18.5f) {
                                                            let _e577 = m_50;
                                                            let _e578 = q_17;
                                                            let _e579 = ng;
                                                            let _e580 = extent_49;
                                                            let _e581 = seed_61;
                                                            let _e582 = p_102;
                                                            let _e583 = edge_2;
                                                            boostMaterial(_e577, _e578, _e579, _e580, _e581, _e582, _e583, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                        } else {
                                                            let _e596 = m_50;
                                                            if (_e596 < 19.5f) {
                                                                let _e599 = m_50;
                                                                let _e600 = q_17;
                                                                let _e601 = ng;
                                                                let _e602 = extent_49;
                                                                let _e603 = seed_61;
                                                                let _e604 = p_102;
                                                                let _e605 = edge_2;
                                                                platformMaterial(_e599, _e600, _e601, _e602, _e603, _e604, _e605, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                            } else {
                                                                let _e618 = m_50;
                                                                if (_e618 < 20.5f) {
                                                                    let _e621 = m_50;
                                                                    let _e622 = q_17;
                                                                    let _e623 = ng;
                                                                    let _e624 = extent_49;
                                                                    let _e625 = seed_61;
                                                                    let _e626 = p_102;
                                                                    let _e627 = edge_2;
                                                                    jumpMaterial(_e621, _e622, _e623, _e624, _e625, _e626, _e627, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
                                                                } else {
                                                                    let _e640 = m_50;
                                                                    let _e641 = q_17;
                                                                    let _e642 = ng;
                                                                    let _e643 = extent_49;
                                                                    let _e644 = seed_61;
                                                                    let _e645 = p_102;
                                                                    let _e646 = edge_2;
                                                                    bumperMaterial(_e640, _e641, _e642, _e643, _e644, _e645, _e646, albedo_17, rough_17, spec_17, emit_17, layers_17, (&relief_17));
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
    let _e659 = ng;
    a_8 = abs(_e659);
    let _e664 = a_8;
    let _e666 = a_8;
    let _e668 = a_8;
    if (_e664.y >= max(_e666.x, _e668.z)) {
        {
            t_6 = vec3<f32>(1f, 0f, 0f);
            b_11 = vec3<f32>(0f, 0f, 1f);
        }
    } else {
        let _e686 = a_8;
        let _e688 = a_8;
        if (_e686.x >= _e688.z) {
            {
                t_6 = vec3<f32>(0f, 0f, 1f);
                b_11 = vec3<f32>(0f, 1f, 0f);
            }
        } else {
            {
                t_6 = vec3<f32>(1f, 0f, 0f);
                b_11 = vec3<f32>(0f, 1f, 0f);
            }
        }
    }
    let _e719 = t_6;
    let _e720 = relief_17;
    let _e723 = b_11;
    let _e724 = relief_17;
    slope_5 = ((_e719 * _e720.x) + (_e723 * _e724.y));
    let _e729 = slope_5;
    let _e730 = ng;
    let _e731 = ng;
    let _e732 = slope_5;
    slope_5 = (_e729 - (_e730 * dot(_e731, _e732)));
    let _e736 = gSurfaceGradient;
    gradient_4 = _e736;
    let _e738 = gradient_4;
    let _e739 = ng;
    let _e740 = ng;
    let _e741 = gradient_4;
    gradient_4 = (_e738 - (_e739 * dot(_e740, _e741)));
    let _e745 = ng;
    let _e746 = slope_5;
    let _e748 = gradient_4;
    (*normal_3) = normalize(((_e745 - _e746) + _e748));
    let _e751 = cube;
    if _e751 {
        let _e752 = uniforms;
        let _e754 = (*normal_3);
        let _e755 = qrot(_e752.uCubeQ, _e754);
        (*normal_3) = _e755;
    }
    let _e756 = m_50;
    let _e757 = q_17;
    let _e758 = extent_49;
    let _e759 = seed_61;
    let _e760 = materialVertexColor(_e756, _e757, _e758, _e759);
    paint_1 = _e760;
    let _e762 = (*rough_17);
    let _e763 = paint_1;
    (*rough_17) = (_e762 + (_e763.w * 0.025f));
    let _e769 = (*layers_17);
    let _e772 = paint_1;
    (*layers_17).y = (_e769.y * (1f - (_e772.w * 0.08f)));
    let _e778 = (*rough_17);
    let _e779 = (*rough_17);
    let _e781 = relief_17;
    (*rough_17) = clamp(sqrt(((_e778 * _e779) + (_e781.z * 2f))), 0.18f, 1f);
    let _e790 = (*albedo_17);
    let _e799 = paint_1;
    (*albedo_17) = (pow(clamp(_e790, vec3(0.001f), vec3(0.95f)), vec3(2.2f)) * _e799.xyz);
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
    let _e214 = m_52;
    let _e215 = p_104;
    let _e216 = n_42;
    surfaceMaterial(_e214, _e215, _e216, albedo_18, rough_18, spec_18, emit_18, (&layers_18), (&normal_4));
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
    let _e214 = m_54;
    let _e215 = p_106;
    let _e216 = geometric_3;
    surfaceMaterial(_e214, _e215, _e216, (&albedo_19), (&rough_19), (&spec_19), (&emit_19), (&layers_19), (&normal_5));
    let _e229 = normal_5;
    return _e229;
}

fn fresnelSchlick(f0_: vec3<f32>, cosine: f32) -> vec3<f32> {
    var f0_1: vec3<f32>;
    var cosine_1: f32;
    var x_4: f32;
    var x2_: f32;

    f0_1 = f0_;
    cosine_1 = cosine;
    let _e207 = cosine_1;
    x_4 = clamp((1f - _e207), 0f, 1f);
    let _e213 = x_4;
    let _e214 = x_4;
    x2_ = (_e213 * _e214);
    let _e217 = f0_1;
    let _e219 = f0_1;
    let _e222 = x2_;
    let _e224 = x2_;
    let _e226 = x_4;
    return (_e217 + ((((vec3(1f) - _e219) * _e222) * _e224) * _e226));
}

fn distributionGGX(nh: f32, rough_20: f32) -> f32 {
    var nh_1: f32;
    var rough_21: f32;
    var a_9: f32;
    var a2_: f32;
    var d_17: f32;

    nh_1 = nh;
    rough_21 = rough_20;
    let _e206 = rough_21;
    let _e207 = rough_21;
    a_9 = max((_e206 * _e207), 0.045f);
    let _e212 = a_9;
    let _e213 = a_9;
    a2_ = (_e212 * _e213);
    let _e216 = nh_1;
    let _e217 = nh_1;
    let _e219 = a2_;
    d_17 = (((_e216 * _e217) * (_e219 - 1f)) + 1f);
    let _e226 = a2_;
    let _e227 = d_17;
    let _e229 = d_17;
    return (_e226 / max(((PI * _e227) * _e229), 0.00005f));
}

fn smithG1_(cosine_2: f32, rough_22: f32) -> f32 {
    var cosine_3: f32;
    var rough_23: f32;
    var k: f32;

    cosine_3 = cosine_2;
    rough_23 = rough_22;
    let _e206 = rough_23;
    let _e209 = rough_23;
    k = (((_e206 + 1f) * (_e209 + 1f)) * 0.125f);
    let _e216 = cosine_3;
    let _e217 = cosine_3;
    let _e219 = k;
    let _e222 = k;
    return (_e216 / max(((_e217 * (1f - _e219)) + _e222), 0.001f));
}

fn roomBounce(p_107: vec3<f32>, n_43: vec3<f32>) -> vec3<f32> {
    var p_108: vec3<f32>;
    var n_44: vec3<f32>;
    var hemi: vec3<f32>;
    var floorNear: f32;
    var side_6: f32;
    var cubeDelta: vec3<f32>;

    p_108 = p_107;
    n_44 = n_43;
    let _e214 = n_44;
    hemi = mix(vec3<f32>(0.055f, 0.066f, 0.08f), vec3<f32>(0.14f, 0.16f, 0.18f), vec3(((_e214.y * 0.5f) + 0.5f)));
    let _e223 = p_108;
    floorNear = exp((-(max(_e223.y, 0f)) * 0.65f));
    let _e233 = n_44;
    side_6 = (1f - abs(_e233.y));
    let _e238 = hemi;
    let _e243 = floorNear;
    let _e245 = n_44;
    let _e250 = side_6;
    hemi = (_e238 + ((vec3<f32>(0.095f, 0.063f, 0.032f) * _e243) * (max(-(_e245.y), 0f) + (_e250 * 0.45f))));
    let _e256 = hemi;
    let _e261 = p_108;
    let _e272 = n_44;
    hemi = (_e256 + ((vec3<f32>(0.022f, 0.049f, 0.014f) * exp((-(max((_e261.x + 3.18f), 0f)) * 0.6f))) * max(-(_e272.x), 0f)));
    let _e279 = hemi;
    let _e285 = p_108;
    let _e295 = n_44;
    hemi = (_e279 + ((vec3<f32>(0.075f, 0.073f, 0.063f) * exp((-(max((3.18f - _e285.x), 0f)) * 0.6f))) * max(_e295.x, 0f)));
    let _e301 = hemi;
    let _e306 = p_108;
    let _e317 = n_44;
    hemi = (_e301 + ((vec3<f32>(0.048f, 0.031f, 0.012f) * exp((-(max((_e306.z + 3.18f), 0f)) * 0.6f))) * max(-(_e317.z), 0f)));
    let _e324 = cubeCenter();
    let _e325 = p_108;
    cubeDelta = (_e324 - _e325);
    let _e328 = hemi;
    let _e333 = cubeScale();
    let _e335 = n_44;
    let _e336 = cubeDelta;
    let _e347 = cubeDelta;
    let _e348 = cubeDelta;
    hemi = (_e328 + (((vec3<f32>(0.032f, 0.0015f, 0.0008f) * _e333) * max(dot(_e335, normalize((_e336 + vec3(0.0001f)))), 0f)) / vec3((1f + (12f * dot(_e347, _e348))))));
    let _e355 = hemi;
    return _e355;
}

fn direct(p_109: vec3<f32>, n_45: vec3<f32>, v_3: vec3<f32>, lp: vec3<f32>, radiance: vec3<f32>, power: f32, rough_24: f32, f0_2: vec3<f32>, albedo_20: vec3<f32>, metallic: f32, visibility_3: f32, coat: f32, coatRough: f32, coatNormal: vec3<f32>) -> vec3<f32> {
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
    var visibility_4: f32;
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
    var f_6: vec3<f32>;
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
    visibility_4 = visibility_3;
    coat_1 = coat;
    coatRough_1 = coatRough;
    coatNormal_1 = coatNormal;
    let _e230 = lp_1;
    let _e231 = p_110;
    l = (_e230 - _e231);
    let _e234 = l;
    let _e235 = l;
    d2_ = dot(_e234, _e235);
    let _e238 = l;
    let _e239 = d2_;
    l = (_e238 * inverseSqrt(max(_e239, 0.001f)));
    let _e244 = n_46;
    let _e245 = l;
    nl = max(dot(_e244, _e245), 0f);
    let _e250 = n_46;
    let _e251 = v_4;
    nv = max(dot(_e250, _e251), 0.001f);
    let _e256 = l;
    let _e257 = v_4;
    h_11 = normalize((_e256 + _e257));
    let _e261 = n_46;
    let _e262 = h_11;
    nh_2 = max(dot(_e261, _e262), 0f);
    let _e267 = v_4;
    let _e268 = h_11;
    vh = max(dot(_e267, _e268), 0f);
    let _e273 = rough_25;
    let _e274 = rough_25;
    let _e277 = d2_;
    r_12 = sqrt(((_e273 * _e274) + (0.008f / max(_e277, 0.1f))));
    let _e284 = f0_3;
    let _e285 = vh;
    let _e286 = fresnelSchlick(_e284, _e285);
    f_6 = _e286;
    let _e289 = f_6;
    let _e293 = metallic_1;
    let _e296 = albedo_21;
    diffuse = ((((vec3(1f) - _e289) * (1f - _e293)) * _e296) / vec3(3.1415927f));
    let _e302 = nh_2;
    let _e303 = r_12;
    let _e304 = distributionGGX(_e302, _e303);
    let _e305 = nl;
    let _e306 = r_12;
    let _e307 = smithG1_(_e305, _e306);
    let _e309 = nv;
    let _e310 = r_12;
    let _e311 = smithG1_(_e309, _e310);
    let _e313 = f_6;
    let _e316 = nl;
    let _e318 = nv;
    specular = ((((_e304 * _e307) * _e311) * _e313) / vec3(max(((4f * _e316) * _e318), 0.001f)));
    let _e325 = coatNormal_1;
    let _e326 = l;
    cnl = max(dot(_e325, _e326), 0f);
    let _e331 = coatNormal_1;
    let _e332 = v_4;
    cnv = max(dot(_e331, _e332), 0.001f);
    let _e337 = coatNormal_1;
    let _e338 = h_11;
    cnh = max(dot(_e337, _e338), 0f);
    let _e345 = vh;
    let _e346 = fresnelSchlick(vec3(0.04f), _e345);
    cf = _e346.x;
    let _e349 = coatRough_1;
    let _e350 = coatRough_1;
    let _e353 = d2_;
    cr = sqrt(((_e349 * _e350) + (0.008f / max(_e353, 0.1f))));
    let _e360 = cnh;
    let _e361 = cr;
    let _e362 = distributionGGX(_e360, _e361);
    let _e363 = cnl;
    let _e364 = cr;
    let _e365 = smithG1_(_e363, _e364);
    let _e367 = cnv;
    let _e368 = cr;
    let _e369 = smithG1_(_e367, _e368);
    let _e371 = cf;
    let _e374 = cnl;
    let _e376 = cnv;
    coating = ((((_e362 * _e365) * _e369) * _e371) / max(((4f * _e374) * _e376), 0.001f));
    let _e384 = cnv;
    let _e385 = fresnelSchlick(vec3(0.04f), _e384);
    fv = _e385.x;
    let _e390 = cnl;
    let _e391 = fresnelSchlick(vec3(0.04f), _e390);
    fl = _e391.x;
    let _e395 = coat_1;
    let _e396 = fv;
    let _e400 = coat_1;
    let _e401 = fl;
    transmission_1 = ((1f - (_e395 * _e396)) * (1f - (_e400 * _e401)));
    let _e406 = diffuse;
    let _e407 = transmission_1;
    diffuse = (_e406 * _e407);
    let _e409 = specular;
    let _e410 = transmission_1;
    let _e412 = coat_1;
    let _e413 = coating;
    let _e415 = cnl;
    let _e417 = nl;
    specular = ((_e409 * _e410) + vec3((((_e412 * _e413) * _e415) / max(_e417, 0.001f))));
    let _e423 = diffuse;
    let _e424 = specular;
    let _e426 = radiance_1;
    let _e428 = power_1;
    let _e430 = nl;
    let _e432 = visibility_4;
    let _e436 = d2_;
    return ((((((_e423 + _e424) * _e426) * _e428) * _e430) * _e432) / vec3((1f + (0.11f * _e436))));
}

fn stripLighting(p_111: vec3<f32>, n_47: vec3<f32>, v_5: vec3<f32>, start_1: vec3<f32>, end_1: vec3<f32>, color: vec3<f32>, power_2: f32, rough_26: f32, f0_4: vec3<f32>, albedo_22: vec3<f32>, metallic_2: f32, visibility_5: f32, coat_2: f32, coatRough_2: f32, coatNormal_2: vec3<f32>) -> vec3<f32> {
    var p_112: vec3<f32>;
    var n_48: vec3<f32>;
    var v_6: vec3<f32>;
    var start_2: vec3<f32>;
    var end_2: vec3<f32>;
    var color_1: vec3<f32>;
    var power_3: f32;
    var rough_27: f32;
    var f0_5: vec3<f32>;
    var albedo_23: vec3<f32>;
    var metallic_3: f32;
    var visibility_6: f32;
    var coat_3: f32;
    var coatRough_3: f32;
    var coatNormal_3: vec3<f32>;
    var radiance_2: vec3<f32> = vec3(0f);
    var i_13: i32 = 0i;
    var local_50: f32;
    var position: f32;

    p_112 = p_111;
    n_48 = n_47;
    v_6 = v_5;
    start_2 = start_1;
    end_2 = end_1;
    color_1 = color;
    power_3 = power_2;
    rough_27 = rough_26;
    f0_5 = f0_4;
    albedo_23 = albedo_22;
    metallic_3 = metallic_2;
    visibility_6 = visibility_5;
    coat_3 = coat_2;
    coatRough_3 = coatRough_2;
    coatNormal_3 = coatNormal_2;
    loop {
        let _e238 = i_13;
        if !((_e238 < 2i)) {
            break;
        }
        {
            let _e245 = i_13;
            if (_e245 == 0i) {
                local_50 = 0.21132487f;
            } else {
                local_50 = 0.7886751f;
            }
            let _e251 = local_50;
            position = _e251;
            let _e253 = radiance_2;
            let _e254 = p_112;
            let _e255 = n_48;
            let _e256 = v_6;
            let _e257 = start_2;
            let _e258 = end_2;
            let _e259 = position;
            let _e262 = color_1;
            let _e263 = power_3;
            let _e266 = rough_27;
            let _e267 = f0_5;
            let _e268 = albedo_23;
            let _e269 = metallic_3;
            let _e270 = visibility_6;
            let _e271 = coat_3;
            let _e272 = coatRough_3;
            let _e273 = coatNormal_3;
            let _e274 = direct(_e254, _e255, _e256, mix(_e257, _e258, vec3(_e259)), _e262, (_e263 * 0.5f), _e266, _e267, _e268, _e269, _e270, _e271, _e272, _e273);
            radiance_2 = (_e253 + _e274);
        }
        continuing {
            let _e242 = i_13;
            i_13 = (_e242 + 1i);
        }
    }
    let _e276 = radiance_2;
    return _e276;
}

fn environment(rd_6: vec3<f32>, rough_28: f32) -> vec3<f32> {
    var rd_7: vec3<f32>;
    var rough_29: f32;
    var c_13: vec3<f32>;

    rd_7 = rd_6;
    rough_29 = rough_28;
    let _e214 = rd_7;
    c_13 = mix(vec3<f32>(0.035f, 0.043f, 0.058f), vec3<f32>(0.16f, 0.18f, 0.2f), vec3(((_e214.y * 0.5f) + 0.5f)));
    let _e223 = c_13;
    let _e228 = rd_7;
    let _e240 = rough_29;
    c_13 = (_e223 + (vec3<f32>(0.22f, 0.16f, 0.09f) * pow(max(dot(_e228, normalize(vec3<f32>(0.1f, 1f, -0.5f))), 0f), mix(90f, 4f, _e240))));
    let _e245 = c_13;
    return _e245;
}

fn quickMat(m_55: f32, p_113: vec3<f32>) -> vec3<f32> {
    var m_56: f32;
    var p_114: vec3<f32>;
    var a_10: vec3<f32> = vec3(0.6f);
    var e_4: vec3<f32> = vec3(0f);

    m_56 = m_55;
    p_114 = p_113;
    let _e213 = m_56;
    if (_e213 < 1.5f) {
        a_10 = vec3<f32>(0.61f, 0.425f, 0.245f);
    } else {
        let _e220 = m_56;
        if (_e220 < 2.5f) {
            a_10 = vec3<f32>(0.245f, 0.262f, 0.269f);
        } else {
            let _e227 = m_56;
            if (_e227 < 3.5f) {
                a_10 = vec3<f32>(0.67f, 0.45f, 0.22f);
            } else {
                let _e234 = m_56;
                if (_e234 < 4.5f) {
                    a_10 = vec3<f32>(0.35f, 0.49f, 0.26f);
                } else {
                    let _e241 = m_56;
                    if (_e241 < 5.5f) {
                        a_10 = vec3<f32>(0.74f, 0.74f, 0.7f);
                    } else {
                        let _e248 = m_56;
                        if (_e248 < 6.5f) {
                            a_10 = vec3<f32>(0.58f, 0.61f, 0.6f);
                        } else {
                            let _e255 = m_56;
                            if (_e255 < 7.5f) {
                                a_10 = vec3<f32>(0.665f, 0.029f, 0.018f);
                            } else {
                                let _e262 = m_56;
                                if (_e262 < 8.5f) {
                                    a_10 = vec3<f32>(0.255f, 0.297f, 0.326f);
                                } else {
                                    let _e269 = m_56;
                                    if (_e269 < 10.5f) {
                                        {
                                            a_10 = vec3<f32>(0.06f, 0.75f, 0.29f);
                                            e_4 = vec3<f32>(0.0175f, 0.475f, 0.125f);
                                        }
                                    } else {
                                        let _e285 = m_56;
                                        if (_e285 < 11.5f) {
                                            {
                                                a_10 = vec3<f32>(0.12f, 0.4f, 0.89f);
                                                e_4 = vec3<f32>(0.0234f, 0.14559999f, 0.52f);
                                            }
                                        } else {
                                            let _e301 = m_56;
                                            if (_e301 < 12.5f) {
                                                {
                                                    a_10 = vec3<f32>(0.88f, 0.63f, 0.12f);
                                                    let _e313 = uniforms;
                                                    e_4 = (vec3<f32>(1f, 0.53f, 0.035f) * (0.45f + (_e313.uHold.x * 0.77f)));
                                                }
                                            } else {
                                                let _e320 = m_56;
                                                if (_e320 < 13.5f) {
                                                    {
                                                        a_10 = vec3<f32>(0.95f, 0.88f, 0.73f);
                                                        e_4 = vec3<f32>(3.2f, 2.688f, 2.016f);
                                                    }
                                                } else {
                                                    let _e336 = m_56;
                                                    if (_e336 < 14.5f) {
                                                        a_10 = vec3<f32>(0.38f, 0.3f, 0.23f);
                                                    } else {
                                                        let _e343 = m_56;
                                                        if (_e343 < 15.5f) {
                                                            {
                                                                a_10 = vec3<f32>(0.025f, 0.11f, 0.065f);
                                                                e_4 = vec3<f32>(0.020000001f, 0.71999997f, 0.296f);
                                                            }
                                                        } else {
                                                            let _e359 = m_56;
                                                            if (_e359 < 16.5f) {
                                                                a_10 = vec3<f32>(0.12f, 0.41f, 0.5f);
                                                            } else {
                                                                let _e366 = m_56;
                                                                if (_e366 < 17.5f) {
                                                                    a_10 = vec3<f32>(0.42f, 0.12f, 0.51f);
                                                                } else {
                                                                    let _e373 = m_56;
                                                                    if (_e373 < 18.5f) {
                                                                        a_10 = vec3<f32>(0.73f, 0.51f, 0.25f);
                                                                    } else {
                                                                        let _e380 = m_56;
                                                                        if (_e380 < 19.5f) {
                                                                            a_10 = vec3<f32>(0.57f, 0.372f, 0.197f);
                                                                        } else {
                                                                            let _e387 = m_56;
                                                                            if (_e387 < 20.5f) {
                                                                                {
                                                                                    a_10 = vec3<f32>(0.12f, 0.77f, 0.87f);
                                                                                    e_4 = vec3<f32>(0.01025f, 0.27060002f, 0.3895f);
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
    let _e407 = a_10;
    let _e413 = e_4;
    return ((pow(_e407, vec3(2.2f)) * 0.55f) + _e413);
}

fn marchEnvelope(ro_4: vec3<f32>, rd_8: vec3<f32>) -> vec2<f32> {
    var ro_5: vec3<f32>;
    var rd_9: vec3<f32>;
    var t_7: f32 = 0f;
    var i_14: i32 = 0i;
    var h_12: vec2<f32>;

    ro_5 = ro_4;
    rd_9 = rd_8;
    loop {
        let _e210 = i_14;
        if !((_e210 < 176i)) {
            break;
        }
        {
            let _e217 = ro_5;
            let _e218 = rd_9;
            let _e219 = t_7;
            let _e222 = mapScene((_e217 + (_e218 * _e219)));
            h_12 = _e222;
            let _e224 = h_12;
            if (_e224.x < 0.001f) {
                let _e228 = t_7;
                let _e229 = h_12;
                return vec2<f32>(_e228, _e229.y);
            }
            let _e232 = t_7;
            if (_e232 > 24f) {
                break;
            }
            let _e235 = t_7;
            let _e236 = h_12;
            t_7 = (_e235 + (_e236.x * 0.8f));
        }
        continuing {
            let _e214 = i_14;
            i_14 = (_e214 + 1i);
        }
    }
    let _e241 = t_7;
    return vec2<f32>(_e241, 0f);
}

fn marchFrom(ro_6: vec3<f32>, rd_10: vec3<f32>, startT: f32) -> vec2<f32> {
    var ro_7: vec3<f32>;
    var rd_11: vec3<f32>;
    var startT_1: f32;
    var t_8: f32;
    var i_15: i32 = 0i;
    var h_13: vec2<f32>;

    ro_7 = ro_6;
    rd_11 = rd_10;
    startT_1 = startT;
    let _e208 = startT_1;
    t_8 = _e208;
    loop {
        let _e212 = i_15;
        if !((_e212 < 176i)) {
            break;
        }
        {
            let _e219 = ro_7;
            let _e220 = rd_11;
            let _e221 = t_8;
            let _e224 = mapScene((_e219 + (_e220 * _e221)));
            h_13 = _e224;
            let _e226 = h_13;
            if (_e226.x < 0.001f) {
                let _e230 = t_8;
                let _e231 = h_13;
                return vec2<f32>(_e230, _e231.y);
            }
            let _e234 = t_8;
            if (_e234 > 24f) {
                break;
            }
            let _e237 = t_8;
            let _e238 = h_13;
            t_8 = (_e237 + (_e238.x * 0.8f));
        }
        continuing {
            let _e216 = i_15;
            i_15 = (_e216 + 1i);
        }
    }
    let _e243 = t_8;
    return vec2<f32>(_e243, 0f);
}

fn march(ro_8: vec3<f32>, rd_12: vec3<f32>) -> vec2<f32> {
    var ro_9: vec3<f32>;
    var rd_13: vec3<f32>;
    var base_1: vec2<f32>;
    var candidateIndex: i32 = 0i;
    var c_14: ReliefCandidate;
    var n_49: vec3<f32>;
    var hit_2: vec2<f32>;
    var c_15: ReliefCandidate;
    var local_51: vec3<f32>;
    var local_52: vec3<f32>;
    var local_53: f32;

    ro_9 = ro_8;
    rd_13 = rd_12;
    gExcludedCandidates = vec3(0f);
    gHitNormalValid = false;
    gHitMaterial = 0f;
    gHitKey = 0f;
    let _e212 = ro_9;
    let _e213 = rd_13;
    let _e214 = marchEnvelope(_e212, _e213);
    base_1 = _e214;
    loop {
        let _e218 = candidateIndex;
        if !((_e218 < 3i)) {
            break;
        }
        {
            let _e225 = base_1;
            let _e229 = base_1;
            let _e231 = reliefDepth(_e229.y);
            if ((_e225.y < 0.5f) || (_e231 <= 0f)) {
                break;
            }
            let _e235 = ro_9;
            let _e236 = rd_13;
            let _e237 = base_1;
            let _e238 = reliefCandidate(_e235, _e236, _e237);
            c_14 = _e238;
            let _e240 = c_14;
            let _e241 = base_1;
            let _e243 = candidateNormal(_e240, _e241.x);
            n_49 = _e243;
            let _e245 = gRayCone;
            if (_e245 > 0f) {
                let _e248 = base_1;
                let _e250 = gRayCone;
                let _e252 = n_49;
                let _e253 = rd_13;
                gReliefFootprint = clamp(((_e248.x * _e250) / max(abs(dot(_e252, _e253)), 0.22f)), 0.0005f, 0.1f);
            }
            let _e262 = c_14;
            let _e263 = base_1;
            let _e265 = parallaxOcclusion(_e262, _e263.x);
            hit_2 = _e265;
            let _e267 = hit_2;
            if (_e267.y > 0f) {
                {
                    let _e271 = c_14;
                    let _e272 = hit_2;
                    let _e274 = candidateNormal(_e271, _e272.x);
                    gHitNormal = _e274;
                    gHitNormalValid = true;
                    let _e276 = hit_2;
                    base_1 = _e276;
                    let _e277 = ro_9;
                    let _e278 = rd_13;
                    let _e279 = hit_2;
                    gHitPoint = (_e277 + (_e278 * _e279.x));
                    let _e283 = c_14;
                    let _e285 = c_14;
                    let _e287 = hit_2;
                    let _e291 = c_14;
                    gHitCoordinates = ((_e283.origin + (_e285.direction * _e287.x)) + _e291.pigmentOffset);
                    let _e294 = c_14;
                    gHitExtent = _e294.extent;
                    let _e296 = c_14;
                    gHitSeed = _e296.seed;
                    let _e298 = hit_2;
                    gHitMaterial = _e298.y;
                    let _e300 = c_14;
                    gHitKey = _e300.key;
                    break;
                }
            }
            let _e302 = c_14;
            let _e304 = gExcludedCandidates;
            let _e305 = _e304.xy;
            gExcludedCandidates = vec3<f32>(_e302.key, _e305.x, _e305.y);
            let _e309 = ro_9;
            let _e310 = rd_13;
            let _e311 = hit_2;
            let _e313 = marchFrom(_e309, _e310, _e311.x);
            base_1 = _e313;
        }
        continuing {
            let _e222 = candidateIndex;
            candidateIndex = (_e222 + 1i);
        }
    }
    let _e314 = base_1;
    let _e318 = base_1;
    let _e323 = gHitNormalValid;
    if (((_e314.y > 0.5f) && (_e318.x < 24f)) && !(_e323)) {
        {
            let _e326 = ro_9;
            let _e327 = rd_13;
            let _e328 = base_1;
            gHitPoint = (_e326 + (_e327 * _e328.x));
            let _e332 = ro_9;
            let _e333 = rd_13;
            let _e334 = base_1;
            let _e335 = reliefCandidate(_e332, _e333, _e334);
            c_15 = _e335;
            let _e337 = c_15;
            let _e338 = base_1;
            let _e340 = candidateNormal(_e337, _e338.x);
            gHitNormal = _e340;
            let _e341 = c_15;
            gHitKey = _e341.key;
            gHitNormalValid = true;
            let _e344 = gExcludedCandidates;
            if (_e344.x > 0f) {
                {
                    let _e348 = base_1;
                    let _e350 = gHitPoint;
                    materialCoordinates(_e348.y, _e350, (&local_51), (&local_52), (&local_53));
                    let _e360 = local_51;
                    gHitCoordinates = _e360;
                    let _e361 = local_52;
                    gHitExtent = _e361;
                    let _e362 = local_53;
                    gHitSeed = _e362;
                    let _e363 = base_1;
                    gHitMaterial = _e363.y;
                }
            }
        }
    }
    gExcludedCandidates = vec3(0f);
    let _e368 = base_1;
    return _e368;
}

fn reflectionProbe(ro_10: vec3<f32>, rd_14: vec3<f32>, rough_30: f32) -> vec3<f32> {
    var ro_11: vec3<f32>;
    var rd_15: vec3<f32>;
    var rough_31: f32;
    var t_9: f32 = 0.025f;
    var fallback: vec3<f32>;
    var i_16: i32 = 0i;
    var p_115: vec3<f32>;
    var h_14: vec2<f32>;
    var saved: f32;
    var color_2: vec3<f32>;

    ro_11 = ro_10;
    rd_15 = rd_14;
    rough_31 = rough_30;
    let _e210 = rd_15;
    let _e211 = rough_31;
    let _e212 = environment(_e210, _e211);
    fallback = _e212;
    loop {
        let _e216 = i_16;
        if !((_e216 < 56i)) {
            break;
        }
        {
            let _e223 = ro_11;
            let _e224 = rd_15;
            let _e225 = t_9;
            p_115 = (_e223 + (_e224 * _e225));
            let _e229 = p_115;
            let _e230 = mapScene(_e229);
            h_14 = _e230;
            let _e232 = h_14;
            let _e235 = t_9;
            let _e236 = rough_31;
            if (_e232.x < (0.002f + ((_e235 * _e236) * 0.0015f))) {
                {
                    let _e242 = gFootprint;
                    saved = _e242;
                    let _e244 = saved;
                    let _e245 = rough_31;
                    let _e246 = rough_31;
                    let _e248 = t_9;
                    gFootprint = max(_e244, (((_e245 * _e246) * _e248) * 0.05f));
                    let _e253 = h_14;
                    let _e255 = p_115;
                    let _e256 = quickMat(_e253.y, _e255);
                    color_2 = _e256;
                    let _e258 = saved;
                    gFootprint = _e258;
                    let _e259 = h_14;
                    let _e263 = h_14;
                    if ((_e259.y > 12.5f) && (_e263.y < 13.5f)) {
                        let _e268 = color_2;
                        let _e269 = fallback;
                        let _e272 = rough_31;
                        color_2 = mix(_e268, _e269, vec3(smoothstep(0.16f, 0.4f, _e272)));
                    }
                    let _e276 = fallback;
                    let _e277 = color_2;
                    let _e278 = t_9;
                    let _e281 = rough_31;
                    let _e282 = rough_31;
                    let _e290 = rough_31;
                    return mix(_e276, _e277, vec3((exp((-(_e278) * (0.055f + ((_e281 * _e282) * 0.3f)))) * (1f - (_e290 * 0.4f)))));
                }
            }
            let _e297 = t_9;
            let _e298 = h_14;
            t_9 = (_e297 + clamp((_e298.x * 0.85f), 0.016f, 0.4f));
            let _e306 = t_9;
            if (_e306 > 12f) {
                break;
            }
        }
        continuing {
            let _e220 = i_16;
            i_16 = (_e220 + 1i);
        }
    }
    let _e309 = fallback;
    return _e309;
}

fn roughReflection(p_116: vec3<f32>, geometric_4: vec3<f32>, rd_16: vec3<f32>, n_50: vec3<f32>, rough_32: f32) -> vec3<f32> {
    var p_117: vec3<f32>;
    var geometric_5: vec3<f32>;
    var rd_17: vec3<f32>;
    var n_51: vec3<f32>;
    var rough_33: f32;
    var r_13: vec3<f32>;
    var sum: vec3<f32> = vec3(0f);
    var local_54: vec3<f32>;
    var tangent: vec3<f32>;
    var i_17: i32 = 0i;
    var local_55: f32;
    var offset_4: f32;
    var direction_1: vec3<f32>;

    p_117 = p_116;
    geometric_5 = geometric_4;
    rd_17 = rd_16;
    n_51 = n_50;
    rough_33 = rough_32;
    let _e212 = rd_17;
    let _e213 = n_51;
    r_13 = reflect(_e212, _e213);
    let _e220 = r_13;
    let _e221 = r_13;
    if (abs(_e221.y) < 0.95f) {
        local_54 = vec3<f32>(0f, 1f, 0f);
    } else {
        local_54 = vec3<f32>(1f, 0f, 0f);
    }
    let _e241 = local_54;
    tangent = normalize(cross(_e220, _e241));
    loop {
        let _e247 = i_17;
        if !((_e247 < 2i)) {
            break;
        }
        {
            if false {
                local_55 = 0f;
            } else {
                let _e258 = i_17;
                local_55 = ((f32(_e258) * 2f) - 1f);
            }
            let _e265 = local_55;
            offset_4 = _e265;
            let _e267 = r_13;
            let _e268 = tangent;
            let _e269 = offset_4;
            let _e271 = rough_33;
            let _e273 = rough_33;
            direction_1 = normalize((_e267 + ((((_e268 * _e269) * _e271) * _e273) * 0.065f)));
            let _e280 = direction_1;
            let _e281 = geometric_5;
            let _e283 = direction_1;
            let _e284 = geometric_5;
            direction_1 = normalize((_e280 + (_e281 * max((0.025f - dot(_e283, _e284)), 0f))));
            let _e292 = sum;
            let _e293 = p_117;
            let _e294 = geometric_5;
            let _e298 = direction_1;
            let _e299 = rough_33;
            let _e300 = reflectionProbe((_e293 + (_e294 * 0.014f)), _e298, _e299);
            sum = (_e292 + _e300);
        }
        continuing {
            let _e251 = i_17;
            i_17 = (_e251 + 1i);
        }
    }
    let _e302 = sum;
    return (_e302 / vec3(2f));
}

fn shortBounce(p_118: vec3<f32>, n_52: vec3<f32>) -> vec3<f32> {
    var p_119: vec3<f32>;
    var n_53: vec3<f32>;
    var result: vec3<f32> = vec3(0f);
    var direction_2: vec3<f32>;
    var t_10: f32 = 0.055f;
    var i_18: i32 = 0i;
    var q_18: vec3<f32>;
    var h_15: vec2<f32>;

    p_119 = p_118;
    n_53 = n_52;
    let _e210 = n_53;
    direction_2 = normalize((_e210 + vec3<f32>(0.42f, 0.36f, -0.28f)));
    loop {
        let _e223 = i_18;
        if !((_e223 < 3i)) {
            break;
        }
        {
            let _e230 = p_119;
            let _e231 = n_53;
            let _e235 = direction_2;
            let _e236 = t_10;
            q_18 = ((_e230 + (_e231 * 0.015f)) + (_e235 * _e236));
            let _e240 = q_18;
            let _e241 = mapScene(_e240);
            h_15 = _e241;
            let _e243 = h_15;
            if (_e243.x < 0.025f) {
                {
                    let _e247 = h_15;
                    let _e249 = q_18;
                    let _e250 = quickMat(_e247.y, _e249);
                    let _e253 = t_10;
                    result = ((_e250 * 0.075f) * exp((-(_e253) * 2f)));
                    break;
                }
            }
            let _e259 = t_10;
            let _e260 = h_15;
            t_10 = (_e259 + clamp(_e260.x, 0.035f, 0.25f));
            let _e266 = t_10;
            if (_e266 > 0.8f) {
                break;
            }
        }
        continuing {
            let _e227 = i_18;
            i_18 = (_e227 + 1i);
        }
    }
    let _e269 = result;
    return _e269;
}

fn lightSpill(p_120: vec3<f32>, n_54: vec3<f32>, source: vec3<f32>, color_3: vec3<f32>, power_4: f32) -> vec3<f32> {
    var p_121: vec3<f32>;
    var n_55: vec3<f32>;
    var source_1: vec3<f32>;
    var color_4: vec3<f32>;
    var power_5: f32;
    var d_18: vec3<f32>;
    var d2_1: f32;

    p_121 = p_120;
    n_55 = n_54;
    source_1 = source;
    color_4 = color_3;
    power_5 = power_4;
    let _e212 = source_1;
    let _e213 = p_121;
    d_18 = (_e212 - _e213);
    let _e216 = d_18;
    let _e217 = d_18;
    d2_1 = dot(_e216, _e217);
    let _e220 = color_4;
    let _e221 = power_5;
    let _e223 = n_55;
    let _e224 = d_18;
    let _e235 = d2_1;
    return (((_e220 * _e221) * max(dot(_e223, normalize((_e224 + vec3(0.0001f)))), 0f)) / vec3((1f + (9f * _e235))));
}

fn zoneSpill(p_122: vec3<f32>, n_56: vec3<f32>, z_4: vec4<f32>) -> vec3<f32> {
    var p_123: vec3<f32>;
    var n_57: vec3<f32>;
    var z_5: vec4<f32>;
    var local_56: vec3<f32>;
    var local_57: vec3<f32>;
    var local_58: vec3<f32>;
    var color_5: vec3<f32>;

    p_123 = p_122;
    n_57 = n_56;
    z_5 = z_4;
    let _e208 = z_5;
    if (_e208.w < 0.5f) {
        return vec3(0f);
    }
    let _e215 = z_5;
    if (_e215.w < 1.5f) {
        local_58 = vec3<f32>(0.015f, 0.05f, 0.065f);
    } else {
        let _e223 = z_5;
        if (_e223.w < 2.5f) {
            local_57 = vec3<f32>(0.04f, 0.01f, 0.05f);
        } else {
            let _e231 = z_5;
            if (_e231.w < 3.5f) {
                local_56 = vec3<f32>(0.045f, 0.026f, 0.01f);
            } else {
                local_56 = vec3<f32>(0.025f, 0.58f, 0.8f);
            }
            let _e244 = local_56;
            local_57 = _e244;
        }
        let _e246 = local_57;
        local_58 = _e246;
    }
    let _e248 = local_58;
    color_5 = _e248;
    let _e250 = p_123;
    let _e251 = n_57;
    let _e252 = z_5;
    let _e255 = z_5;
    let _e258 = color_5;
    let _e260 = lightSpill(_e250, _e251, vec3<f32>(_e252.x, 0.12f, _e255.y), _e258, 0.25f);
    return _e260;
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
    var localPoint: vec3<f32>;
    var extent_50: vec3<f32>;
    var localNormal: vec3<f32>;
    var keyLight_2: vec3<f32>;
    var rimLight_2: vec3<f32>;
    var seed_62: f32;
    var iq_3: vec4<f32>;
    var reliefLightVisibility: vec2<f32>;
    var local_59: vec3<f32>;
    var n_58: vec3<f32>;
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
    var f_7: vec3<f32>;
    var coat_4: f32;
    var coatRough_4: f32;
    var key_4: vec3<f32>;
    var visibility_7: f32;
    var col: vec3<f32>;
    var rimShadow: f32 = 1f;
    var wrap: f32;
    var thin: f32;
    var cf_1: f32;
    var response: vec3<f32>;
    var spill: vec3<f32>;
    var d_19: vec2<f32>;
    var contact_1: f32;
    var local_60: f32;
    var frame_1: f32;
    var radius_5: f32;
    var wave_1: f32;
    var halo: f32;
    var pulse_1: f32;
    var ring_1: f32;
    var glow: f32;

    p_125 = p_124;
    geometric_7 = geometric_6;
    m_58 = m_57;
    rd_19 = rd_18;
    let _e217 = lp_2;
    let _e218 = p_125;
    ld = (_e217 - _e218);
    let _e227 = rim_3;
    let _e228 = p_125;
    rl = (_e227 - _e228);
    let _e233 = geometric_7;
    localNormal = _e233;
    let _e235 = ld;
    keyLight_2 = normalize(_e235);
    let _e238 = rl;
    rimLight_2 = normalize(_e238);
    let _e242 = m_58;
    let _e243 = p_125;
    materialCoordinates(_e242, _e243, (&localPoint), (&extent_50), (&seed_62));
    let _e250 = m_58;
    let _e253 = m_58;
    if ((_e250 > 6.5f) && (_e253 < 7.5f)) {
        {
            let _e257 = uniforms;
            let _e260 = -(_e257.uCubeQ.xyz);
            let _e261 = uniforms;
            iq_3 = vec4<f32>(_e260.x, _e260.y, _e260.z, _e261.uCubeQ.w);
            let _e269 = iq_3;
            let _e270 = geometric_7;
            let _e271 = qrot(_e269, _e270);
            localNormal = _e271;
            let _e272 = iq_3;
            let _e273 = keyLight_2;
            let _e274 = qrot(_e272, _e273);
            keyLight_2 = _e274;
            let _e275 = iq_3;
            let _e276 = rimLight_2;
            let _e277 = qrot(_e275, _e276);
            rimLight_2 = _e277;
        }
    }
    let _e279 = m_58;
    let _e280 = localPoint;
    let _e281 = extent_50;
    let _e282 = seed_62;
    let _e283 = localNormal;
    let _e284 = keyLight_2;
    let _e285 = rimLight_2;
    reliefLighting(_e279, _e280, _e281, _e282, _e283, _e284, _e285, (&local_59), (&reliefLightVisibility));
    let _e291 = local_59;
    gSurfaceGradient = _e291;
    let _e298 = m_58;
    let _e299 = p_125;
    let _e300 = geometric_7;
    surfaceMaterial(_e298, _e299, _e300, (&albedo_24), (&rough_34), (&spec_20), (&emit_20), (&layers_20), (&n_58));
    let _e313 = rd_19;
    v_7 = -(_e313);
    let _e316 = layers_20;
    metallic_4 = _e316.x;
    let _e319 = p_125;
    let _e320 = geometric_7;
    let _e321 = ao(_e319, _e320);
    amb = _e321;
    let _e323 = n_58;
    let _e324 = v_7;
    nv_1 = max(dot(_e323, _e324), 0f);
    let _e330 = spec_20;
    let _e338 = albedo_24;
    let _e339 = metallic_4;
    f0_6 = mix(vec3(clamp((0.024f + (_e330 * 0.075f)), 0.025f, 0.065f)), _e338, vec3(_e339));
    let _e343 = f0_6;
    let _e344 = nv_1;
    let _e345 = fresnelSchlick(_e343, _e344);
    f_7 = _e345;
    let _e347 = layers_20;
    coat_4 = _e347.y;
    let _e350 = layers_20;
    coatRough_4 = _e350.z;
    let _e357 = uniforms;
    let _e361 = uniforms;
    key_4 = (vec3<f32>(1f, 0.86f, 0.68f) + vec3<f32>(_e357.uLook.y, 0f, -(_e361.uLook.y)));
    let _e368 = p_125;
    let _e369 = geometric_7;
    let _e373 = ld;
    let _e376 = ld;
    let _e380 = softShadow((_e368 + (_e369 * 0.009f)), normalize(_e373), 0.014f, (length(_e376) - 0.04f));
    visibility_7 = _e380;
    let _e382 = visibility_7;
    let _e383 = reliefLightVisibility;
    visibility_7 = (_e382 * _e383.x);
    let _e386 = albedo_24;
    let _e388 = metallic_4;
    let _e392 = f_7;
    let _e396 = p_125;
    let _e397 = geometric_7;
    let _e398 = roomBounce(_e396, _e397);
    let _e400 = amb;
    col = ((((_e386 * (1f - _e388)) * (vec3(1f) - _e392)) * _e398) * _e400);
    let _e403 = col;
    let _e404 = p_125;
    let _e405 = n_58;
    let _e406 = v_7;
    let _e407 = lp_2;
    let _e408 = key_4;
    let _e410 = rough_34;
    let _e411 = f0_6;
    let _e412 = albedo_24;
    let _e413 = metallic_4;
    let _e414 = visibility_7;
    let _e415 = coat_4;
    let _e416 = coatRough_4;
    let _e417 = geometric_7;
    let _e418 = direct(_e404, _e405, _e406, _e407, _e408, 5.7f, _e410, _e411, _e412, _e413, _e414, _e415, _e416, _e417);
    col = (_e403 + _e418);
    let _e420 = col;
    let _e421 = p_125;
    let _e422 = n_58;
    let _e423 = v_7;
    let _e440 = rough_34;
    let _e441 = f0_6;
    let _e442 = albedo_24;
    let _e443 = metallic_4;
    let _e445 = coat_4;
    let _e446 = coatRough_4;
    let _e447 = geometric_7;
    let _e448 = stripLighting(_e421, _e422, _e423, vec3<f32>(-1.95f, 3.04f, -1.65f), vec3<f32>(-1.95f, 3.04f, 0.9f), vec3<f32>(0.92f, 0.94f, 1f), 2.6f, _e440, _e441, _e442, _e443, 0.85f, _e445, _e446, _e447);
    col = (_e420 + _e448);
    let _e452 = p_125;
    let _e453 = geometric_7;
    let _e457 = rl;
    let _e460 = rl;
    let _e464 = softShadow((_e452 + (_e453 * 0.009f)), normalize(_e457), 0.014f, (length(_e460) - 0.04f));
    rimShadow = _e464;
    let _e465 = rimShadow;
    let _e466 = reliefLightVisibility;
    rimShadow = (_e465 * _e466.y);
    let _e469 = col;
    let _e470 = p_125;
    let _e471 = n_58;
    let _e472 = v_7;
    let _e473 = rim_3;
    let _e479 = rough_34;
    let _e480 = f0_6;
    let _e481 = albedo_24;
    let _e482 = metallic_4;
    let _e483 = rimShadow;
    let _e484 = coat_4;
    let _e485 = coatRough_4;
    let _e486 = geometric_7;
    let _e487 = direct(_e470, _e471, _e472, _e473, vec3<f32>(1f, 0.86f, 0.69f), 1.7f, _e479, _e480, _e481, _e482, _e483, _e484, _e485, _e486);
    col = (_e469 + _e487);
    let _e489 = col;
    let _e490 = albedo_24;
    let _e491 = layers_20;
    let _e495 = nv_1;
    let _e500 = p_125;
    let _e501 = geometric_7;
    let _e502 = roomBounce(_e500, _e501);
    let _e504 = amb;
    col = (_e489 + ((((_e490 * _e491.w) * pow((1f - _e495), 4f)) * _e502) * _e504));
    let _e507 = col;
    let _e510 = amb;
    col = (_e507 * (0.88f + (0.12f * _e510)));
    let _e514 = m_58;
    let _e517 = m_58;
    if ((_e514 > 16.5f) && (_e517 < 17.5f)) {
        let _e521 = col;
        let _e527 = nv_1;
        let _e534 = amb;
        col = (_e521 + ((vec3<f32>(0.19f, 0.009f, 0.29f) * pow((1f - _e527), 2f)) * (0.55f + (0.45f * _e534))));
    }
    let _e539 = m_58;
    if (_e539 > 21.5f) {
        {
            let _e542 = n_58;
            let _e544 = ld;
            wrap = pow(clamp(((dot(-(_e542), normalize(_e544)) + 0.45f) / 1.45f), 0f, 1f), 2f);
            let _e560 = nv_1;
            thin = (0.18f + (0.82f * pow((1f - _e560), 2f)));
            let _e567 = col;
            let _e572 = wrap;
            let _e574 = thin;
            let _e578 = amb;
            col = (_e567 + (((vec3<f32>(0.58f, 0.055f, 0.018f) * _e572) * _e574) * (0.5f + (0.5f * _e578))));
        }
    }
    let _e583 = rough_34;
    let _e586 = m_58;
    let _e589 = m_58;
    let _e592 = m_58;
    let _e597 = m_58;
    let _e600 = m_58;
    let _e605 = m_58;
    let _e608 = m_58;
    let _e613 = m_58;
    if ((_e583 < 0.78f) && (((((_e586 < 1.5f) || ((_e589 > 6.5f) && (_e592 < 8.5f))) || ((_e597 > 13.5f) && (_e600 < 17.5f))) || ((_e605 > 18.5f) && (_e608 < 19.5f))) || (_e613 > 21.5f))) {
        {
            let _e621 = geometric_7;
            let _e622 = v_7;
            cf_1 = (0.04f + (0.96f * pow((1f - max(dot(_e621, _e622), 0f)), 5f)));
            let _e632 = f_7;
            let _e634 = coat_4;
            let _e635 = cf_1;
            let _e640 = coat_4;
            let _e641 = cf_1;
            let _e645 = coat_4;
            let _e646 = cf_1;
            response = (((_e632 * (1f - (_e634 * _e635))) * (1f - (_e640 * _e641))) + vec3((_e645 * _e646)));
            let _e651 = col;
            let _e652 = p_125;
            let _e653 = geometric_7;
            let _e654 = rd_19;
            let _e655 = n_58;
            let _e656 = rough_34;
            let _e657 = coatRough_4;
            let _e658 = coat_4;
            let _e662 = roughReflection(_e652, _e653, _e654, _e655, mix(_e656, _e657, (_e658 * 0.35f)));
            let _e663 = response;
            let _e666 = rough_34;
            let _e673 = amb;
            col = (_e651 + (((_e662 * _e663) * (1f - (_e666 * 0.55f))) * (0.6f + (0.4f * _e673))));
        }
    }
    let _e678 = m_58;
    let _e681 = m_58;
    let _e684 = m_58;
    if ((_e678 < 1.5f) || ((_e681 > 6.5f) && (_e684 < 8.5f))) {
        let _e689 = col;
        let _e690 = albedo_24;
        let _e691 = p_125;
        let _e692 = geometric_7;
        let _e693 = shortBounce(_e691, _e692);
        let _e695 = amb;
        col = (_e689 + ((_e690 * _e693) * _e695));
    }
    let _e698 = p_125;
    let _e699 = geometric_7;
    let _e700 = uniforms;
    let _e705 = uniforms;
    let _e709 = uniforms;
    let _e714 = targetColor();
    let _e716 = uniforms;
    let _e722 = lightSpill(_e698, _e699, vec3<f32>(_e700.uTarget.x, (0.16f + _e705.uTargetY.x), _e709.uTarget.y), _e714, (0.9f + (_e716.uTransition.z * 1.8f)));
    spill = _e722;
    let _e724 = uniforms;
    if (_e724.uTargetType.x > 3.5f) {
        let _e729 = spill;
        let _e730 = p_125;
        let _e731 = geometric_7;
        let _e732 = uniforms;
        let _e737 = uniforms;
        let _e744 = targetColor();
        let _e746 = uniforms;
        let _e752 = lightSpill(_e730, _e731, vec3<f32>(_e732.uTarget.x, (0.75f + _e737.uTargetY.x), -3.08f), _e744, (1.3f + (_e746.uTransition.z * 2f)));
        spill = (_e729 + _e752);
    }
    let _e754 = spill;
    let _e755 = p_125;
    let _e756 = geometric_7;
    let _e757 = uniforms;
    let _e759 = zoneSpill(_e755, _e756, _e757.uZone0_);
    spill = (_e754 + _e759);
    let _e761 = spill;
    let _e762 = p_125;
    let _e763 = geometric_7;
    let _e764 = uniforms;
    let _e766 = zoneSpill(_e762, _e763, _e764.uZone1_);
    spill = (_e761 + _e766);
    let _e768 = spill;
    let _e769 = p_125;
    let _e770 = geometric_7;
    let _e771 = uniforms;
    let _e773 = zoneSpill(_e769, _e770, _e771.uZone2_);
    spill = (_e768 + _e773);
    let _e775 = spill;
    let _e776 = p_125;
    let _e777 = geometric_7;
    let _e778 = uniforms;
    let _e780 = zoneSpill(_e776, _e777, _e778.uZone3_);
    spill = (_e775 + _e780);
    let _e782 = spill;
    let _e783 = p_125;
    let _e784 = geometric_7;
    let _e785 = uniforms;
    let _e787 = zoneSpill(_e783, _e784, _e785.uZone4_);
    spill = (_e782 + _e787);
    let _e789 = spill;
    let _e790 = p_125;
    let _e791 = geometric_7;
    let _e792 = uniforms;
    let _e794 = zoneSpill(_e790, _e791, _e792.uZone5_);
    spill = (_e789 + _e794);
    let _e796 = spill;
    let _e797 = p_125;
    let _e798 = geometric_7;
    let _e799 = uniforms;
    let _e801 = zoneSpill(_e797, _e798, _e799.uZone6_);
    spill = (_e796 + _e801);
    let _e803 = spill;
    let _e804 = p_125;
    let _e805 = geometric_7;
    let _e806 = uniforms;
    let _e808 = zoneSpill(_e804, _e805, _e806.uZone7_);
    spill = (_e803 + _e808);
    let _e810 = col;
    let _e811 = albedo_24;
    let _e812 = spill;
    let _e814 = amb;
    col = (_e810 + ((_e811 * _e812) * _e814));
    let _e817 = m_58;
    let _e820 = m_58;
    let _e823 = m_58;
    let _e828 = geometric_7;
    if (((_e817 < 2.5f) || ((_e820 > 18.5f) && (_e823 < 19.5f))) && (_e828.y > 0.5f)) {
        {
            let _e833 = p_125;
            let _e835 = uniforms;
            let _e842 = cubeScale();
            d_19 = ((_e833.xz - _e835.uCube.xy) / (vec2<f32>(0.34f, 0.32f) * _e842));
            let _e846 = d_19;
            let _e847 = d_19;
            let _e854 = uniforms;
            let _e857 = p_125;
            contact_1 = (exp((-(dot(_e846, _e847)) * 1.6f)) * exp((-(max(0f, (_e854.uCubeFoot.x - _e857.y))) * 7f)));
            let _e867 = col;
            let _e870 = contact_1;
            let _e873 = cubeScale();
            col = (_e867 * (1f - ((0.22f * _e870) * min(1f, _e873))));
        }
    }
    let _e878 = m_58;
    let _e881 = m_58;
    if ((_e878 > 14.5f) && (_e881 < 15.5f)) {
        {
            let _e885 = p_125;
            if (_e885.z < -3.09f) {
                let _e892 = p_125;
                let _e894 = uniforms;
                let _e902 = p_125;
                let _e906 = uniforms;
                local_60 = smoothstep(0.83f, 0.94f, max((abs((_e892.x - _e894.uTarget.x)) / 0.58f), (abs(((_e902.y - 0.74f) - _e906.uTargetY.x)) / 0.7f)));
            } else {
                local_60 = 0f;
            }
            let _e917 = local_60;
            frame_1 = _e917;
            let _e919 = p_125;
            let _e920 = rd_19;
            let _e921 = portalEnergy(_e919, _e920);
            let _e924 = frame_1;
            let _e928 = uniforms;
            emit_20 = ((_e921 * mix(1f, 0.32f, _e924)) * (1f + (_e928.uTransition.z * 1.8f)));
        }
    }
    let _e935 = uniforms;
    if (_e935.uTransition.z > 0.001f) {
        {
            let _e940 = p_125;
            let _e942 = uniforms;
            radius_5 = length((_e940.xz - _e942.uTarget.xy));
            let _e948 = radius_5;
            let _e950 = uniforms;
            wave_1 = abs((_e948 - (0.4f + (_e950.uTransition.w * 0.25f))));
            let _e959 = wave_1;
            let _e961 = aaLine(_e959, 0.045f);
            let _e962 = radius_5;
            let _e964 = uniforms;
            let _e973 = aaLine(abs((_e962 - (0.54f + (_e964.uTransition.w * 0.12f)))), 0.016f);
            halo = (_e961 + (_e973 * 0.55f));
            let _e978 = halo;
            let _e979 = p_125;
            let _e981 = uniforms;
            let _e990 = geometric_7;
            halo = (_e978 * (exp((-(abs((_e979.y - _e981.uTargetY.x))) * 18f)) * max(_e990.y, 0f)));
            let _e996 = col;
            let _e997 = targetColor();
            let _e998 = halo;
            let _e1000 = uniforms;
            col = (_e996 + (((_e997 * _e998) * _e1000.uTransition.z) * 2f));
            let _e1007 = m_58;
            let _e1010 = m_58;
            let _e1014 = m_58;
            let _e1017 = m_58;
            if (((_e1007 > 9.5f) && (_e1010 < 12.5f)) || ((_e1014 > 14.5f) && (_e1017 < 15.5f))) {
                let _e1022 = emit_20;
                let _e1023 = targetColor();
                let _e1024 = uniforms;
                let _e1030 = radius_5;
                let _e1033 = uniforms;
                emit_20 = (_e1022 + ((_e1023 * _e1024.uTransition.z) * (0.65f + (0.35f * sin(((_e1030 * 22f) - (_e1033.uTransition.w * 5f)))))));
            }
            let _e1044 = m_58;
            let _e1047 = m_58;
            if ((_e1044 > 6.5f) && (_e1047 < 7.5f)) {
                let _e1051 = emit_20;
                let _e1056 = targetColor();
                let _e1060 = uniforms;
                let _e1066 = p_125;
                let _e1067 = cubeLocal(_e1066);
                let _e1068 = cubeEdge(_e1067);
                emit_20 = (_e1051 + ((mix(vec3<f32>(1f, 0.18f, 0.04f), _e1056, vec3(0.3f)) * _e1060.uTransition.z) * (0.09f + (0.65f * _e1068))));
            }
        }
    }
    let _e1073 = uniforms;
    let _e1076 = uniforms;
    pulse_1 = (_e1073.uPulse.z * _e1076.uLook.w);
    let _e1081 = pulse_1;
    if (_e1081 > 0.001f) {
        {
            let _e1084 = p_125;
            let _e1086 = uniforms;
            let _e1094 = pulse_1;
            ring_1 = abs((length((_e1084.xz - _e1086.uPulse.xy)) - mix(0.14f, 2.08f, (1f - _e1094))));
            let _e1100 = p_125;
            let _e1102 = uniforms;
            let _e1111 = ring_1;
            let _e1113 = aaLine(_e1111, 0.03f);
            let _e1115 = pulse_1;
            glow = ((exp((-(abs((_e1100.y - _e1102.uTargetY.x))) * 25f)) * _e1113) * _e1115);
            let _e1118 = col;
            let _e1119 = targetColor();
            let _e1120 = glow;
            col = (_e1118 + ((_e1119 * _e1120) * 0.75f));
        }
    }
    let _e1125 = col;
    let _e1126 = emit_20;
    return max((_e1125 + _e1126), vec3(0f));
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
    let _e208 = p_127;
    let _e209 = a_12;
    pa = (_e208 - _e209);
    let _e212 = b_13;
    let _e213 = a_12;
    ba = (_e212 - _e213);
    let _e216 = pa;
    let _e217 = ba;
    let _e218 = pa;
    let _e219 = ba;
    let _e221 = ba;
    let _e222 = ba;
    return length((_e216 - (_e217 * clamp((dot(_e218, _e219) / dot(_e221, _e222)), 0f, 1f))));
}

fn safeRcp(x_5: f32) -> f32 {
    var x_6: f32;
    var local_61: f32;
    var local_62: f32;

    x_6 = x_5;
    let _e205 = x_6;
    if (abs(_e205) < 0.0001f) {
        let _e209 = x_6;
        if (_e209 < 0f) {
            local_61 = -0.0001f;
        } else {
            local_61 = 0.0001f;
        }
        let _e216 = local_61;
        local_62 = _e216;
    } else {
        let _e217 = x_6;
        local_62 = _e217;
    }
    let _e219 = local_62;
    return (1f / _e219);
}

fn airInterval(ro_12: vec3<f32>, rd_20: vec3<f32>, hitDistance: f32) -> vec2<f32> {
    var ro_13: vec3<f32>;
    var rd_21: vec3<f32>;
    var hitDistance_1: f32;
    var inv: vec3<f32>;
    var a_13: vec3<f32>;
    var b_14: vec3<f32>;
    var lo_1: vec3<f32>;
    var hi_1: vec3<f32>;
    var begin: f32;
    var end_3: f32;

    ro_13 = ro_12;
    rd_21 = rd_20;
    hitDistance_1 = hitDistance;
    let _e208 = rd_21;
    let _e210 = safeRcp(_e208.x);
    let _e211 = rd_21;
    let _e213 = safeRcp(_e211.y);
    let _e214 = rd_21;
    let _e216 = safeRcp(_e214.z);
    inv = vec3<f32>(_e210, _e213, _e216);
    let _e225 = ro_13;
    let _e227 = inv;
    a_13 = ((vec3<f32>(-3.18f, 0.02f, -3.18f) - _e225) * _e227);
    let _e234 = ro_13;
    let _e236 = inv;
    b_14 = ((vec3<f32>(3.18f, 3.13f, 3.2f) - _e234) * _e236);
    let _e239 = a_13;
    let _e240 = b_14;
    lo_1 = min(_e239, _e240);
    let _e243 = a_13;
    let _e244 = b_14;
    hi_1 = max(_e243, _e244);
    let _e248 = lo_1;
    let _e250 = lo_1;
    let _e252 = lo_1;
    begin = max(0f, max(_e248.x, max(_e250.y, _e252.z)));
    let _e258 = hitDistance_1;
    let _e259 = hi_1;
    let _e261 = hi_1;
    let _e263 = hi_1;
    end_3 = min(_e258, min(_e259.x, min(_e261.y, _e263.z)));
    let _e269 = begin;
    let _e270 = begin;
    let _e271 = end_3;
    return vec2<f32>(_e269, max(_e270, _e271));
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
    var i_19: i32 = 0i;
    var t_11: f32;
    var p_128: vec3<f32>;
    var dust: f32;
    var density_1: f32;
    var extinction_1: f32;
    var strip: f32;
    var toLight: vec3<f32>;
    var cosine_4: f32;
    var g: f32;
    var phase_3: f32;
    var source_2: vec3<f32>;
    var delta_2: vec3<f32>;

    color_7 = color_6;
    ro_15 = ro_14;
    rd_23 = rd_22;
    hitDistance_3 = hitDistance_2;
    let _e210 = ro_15;
    let _e211 = rd_23;
    let _e212 = hitDistance_3;
    let _e213 = airInterval(_e210, _e211, _e212);
    interval = _e213;
    let _e215 = interval;
    let _e217 = interval;
    ds = ((_e215.y - _e217.x) / 12f);
    loop {
        let _e232 = i_19;
        if !((_e232 < 12i)) {
            break;
        }
        {
            let _e239 = interval;
            let _e241 = i_19;
            let _e245 = ds;
            t_11 = (_e239.x + ((f32(_e241) + 0.5f) * _e245));
            let _e249 = ro_15;
            let _e250 = rd_23;
            let _e251 = t_11;
            p_128 = (_e249 + (_e250 * _e251));
            let _e257 = p_128;
            let _e261 = effectTime();
            let _e264 = p_128;
            let _e270 = noise(((_e257.xz * 1.3f) + vec2<f32>((_e261 * 0.014f), (_e264.y * 0.65f))));
            dust = (0.82f + (0.18f * _e270));
            let _e275 = uniforms;
            let _e281 = p_128;
            let _e292 = dust;
            density_1 = (((0.012f * _e275.uLook.z) * (0.45f + (0.55f * exp((-(max(_e281.y, 0f)) * 0.6f))))) * _e292);
            let _e295 = density_1;
            let _e297 = ds;
            extinction_1 = exp((-(_e295) * _e297));
            let _e301 = p_128;
            let _e313 = segDist(_e301, vec3<f32>(-1.95f, 3.09f, -1.65f), vec3<f32>(1.95f, 3.09f, -1.65f));
            strip = exp((-(_e313) * 1.4f));
            let _e319 = strip;
            let _e320 = p_128;
            let _e332 = segDist(_e320, vec3<f32>(-1.95f, 3.09f, -1.7f), vec3<f32>(-1.95f, 3.09f, 1.05f));
            strip = (_e319 + (exp((-(_e332) * 1.6f)) * 0.45f));
            let _e340 = strip;
            let _e341 = p_128;
            let _e351 = segDist(_e341, vec3<f32>(1.95f, 3.09f, -1.7f), vec3<f32>(1.95f, 3.09f, 1.05f));
            strip = (_e340 + (exp((-(_e351) * 1.6f)) * 0.45f));
            let _e365 = p_128;
            toLight = normalize((vec3<f32>(0f, 3.09f, -1.65f) - _e365));
            let _e369 = rd_23;
            let _e371 = toLight;
            cosine_4 = dot(-(_e369), _e371);
            g = 0.32f;
            let _e377 = g;
            let _e378 = g;
            let _e382 = g;
            let _e383 = g;
            let _e387 = g;
            let _e389 = cosine_4;
            phase_3 = ((1f - (_e377 * _e378)) / pow(max(((1f + (_e382 * _e383)) - ((2f * _e387) * _e389)), 0.1f), 1.5f));
            let _e398 = strip;
            let _e401 = p_128;
            let _e402 = toLight;
            let _e406 = mapScene((_e401 + (_e402 * 0.18f)));
            strip = (_e398 * smoothstep(0.01f, 0.14f, _e406.x));
            let _e418 = strip;
            let _e420 = phase_3;
            source_2 = (vec3<f32>(0.1f, 0.13f, 0.17f) + (((vec3<f32>(1f, 0.82f, 0.59f) * _e418) * _e420) * 0.8f));
            let _e426 = uniforms;
            if (_e426.uTargetType.x > 3.5f) {
                {
                    let _e431 = p_128;
                    let _e432 = uniforms;
                    let _e437 = uniforms;
                    delta_2 = (_e431 - vec3<f32>(_e432.uTarget.x, (0.75f + _e437.uTargetY.x), -3.08f));
                    let _e446 = source_2;
                    let _e451 = delta_2;
                    let _e452 = delta_2;
                    source_2 = (_e446 + (vec3<f32>(0.015f, 0.6f, 0.22f) * exp((-(dot(_e451, _e452)) * 3f))));
                }
            }
            let _e460 = scatter;
            let _e461 = transmission_2;
            let _e463 = extinction_1;
            let _e466 = source_2;
            scatter = (_e460 + ((_e461 * (1f - _e463)) * _e466));
            let _e469 = transmission_2;
            let _e470 = extinction_1;
            transmission_2 = (_e469 * _e470);
        }
        continuing {
            let _e236 = i_19;
            i_19 = (_e236 + 1i);
        }
    }
    let _e472 = color_7;
    let _e473 = transmission_2;
    let _e475 = scatter;
    return ((_e472 * _e473) + _e475);
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
    let _e205 = uniforms;
    let _e210 = hash(vec2<f32>(_e205.uTime.x, 1.3f));
    let _e212 = uniforms;
    let _e216 = hash(vec2<f32>(2.7f, _e212.uTime.x));
    jitter = (vec2<f32>(_e210, _e216) - vec2(0.5f));
    let _e222 = frag_1;
    let _e225 = uniforms;
    let _e230 = uniforms;
    let _e236 = jitter;
    let _e237 = uniforms;
    uv_17 = ((((_e222 * 2f) - _e225.uRes.xy) / vec2(_e230.uRes.y)) + ((_e236 * _e237.uShake.x) * 0.018f));
    let _e245 = uv_17;
    let _e246 = uv_17;
    lens = dot(_e245, _e246);
    let _e249 = uv_17;
    let _e252 = lens;
    uv_17 = (_e249 * (1f + (0.035f * _e252)));
    let _e256 = uniforms;
    let _e260 = uniforms;
    land = step(_e256.uRes.y, _e260.uRes.x);
    let _e268 = land;
    fov = mix(1.02f, 1.34f, _e268);
    let _e271 = uniforms;
    let _e277 = uniforms;
    let _e283 = uniforms;
    let _e289 = uniforms;
    let _e294 = uniforms;
    let _e299 = uniforms;
    let _e309 = land;
    let _e311 = uniforms;
    (*ro_16) = vec3<f32>(((_e271.uGravity.x * 0.5f) + ((_e277.uCube.x * 0.055f) * _e283.uMotion.x)), ((1.42f + ((_e289.uCubeY.x * 0.06f) * _e294.uMotion.x)) + (abs(_e299.uGravity.y) * 0.1f)), (mix(5.78f, 5.08f, _e309) + (_e311.uGravity.y * 0.3f)));
    let _e319 = uniforms;
    let _e325 = uniforms;
    let _e330 = uniforms;
    let _e335 = uniforms;
    let _e342 = uniforms;
    let _e348 = uniforms;
    ta = vec3<f32>(((_e319.uCube.x * 0.05f) * _e325.uMotion.x), (0.82f + ((_e330.uCubeY.x * 0.18f) * _e335.uMotion.x)), (-0.56f + ((_e342.uCube.y * 0.04f) * _e348.uMotion.x)));
    let _e355 = ta;
    let _e356 = (*ro_16);
    ww = normalize((_e355 - _e356));
    let _e360 = ww;
    uu = normalize(cross(_e360, vec3<f32>(0f, 1f, 0f)));
    let _e371 = uu;
    let _e372 = ww;
    vv = cross(_e371, _e372);
    let _e375 = uu;
    let _e376 = uv_17;
    let _e379 = vv;
    let _e380 = uv_17;
    let _e384 = ww;
    let _e385 = fov;
    return normalize((((_e375 * _e376.x) + (_e379 * _e380.y)) + (_e384 * _e385)));
}

fn aces(x_7: vec3<f32>) -> vec3<f32> {
    var x_8: vec3<f32>;
    var a_14: f32 = 2.51f;
    var b_15: f32 = 0.03f;
    var c_16: f32 = 2.43f;
    var d_20: f32 = 0.59f;
    var e_5: f32 = 0.14f;

    x_8 = x_7;
    let _e214 = x_8;
    let _e215 = a_14;
    let _e216 = x_8;
    let _e218 = b_15;
    let _e222 = x_8;
    let _e223 = c_16;
    let _e224 = x_8;
    let _e226 = d_20;
    let _e230 = e_5;
    return clamp(((_e214 * ((_e215 * _e216) + vec3(_e218))) / ((_e222 * ((_e223 * _e224) + vec3(_e226))) + vec3(_e230))), vec3(0f), vec3(1f));
}

fn packSurfaceWord(word: f32) -> vec2<f32> {
    var word_1: f32;

    word_1 = word;
    let _e204 = word_1;
    let _e208 = word_1;
    return (vec2<f32>(floor((_e204 / 256f)), (_e208 - (floor((_e208 / 256f)) * 256f))) / vec2(255f));
}

fn unpackSurfaceWord(bytes: vec2<f32>) -> f32 {
    var bytes_1: vec2<f32>;

    bytes_1 = bytes;
    let _e204 = bytes_1;
    return dot(floor(((_e204 * 255f) + vec2(0.5f))), vec2<f32>(256f, 1f));
}

fn main_1() {
    var ro_17: vec3<f32>;
    var rd_24: vec3<f32>;
    var rayCone: f32;
    var surface: vec4<f32>;
    var key_5: f32;
    var depth_3: f32;
    var hit_3: vec2<f32>;
    var c_17: ReliefCandidate;
    var col_1: vec3<f32> = vec3<f32>(0.018f, 0.024f, 0.032f);
    var p_129: vec3<f32>;
    var geometric_8: vec3<f32>;
    var q_19: vec2<f32>;
    var lum: f32;

    let _e204 = gl_FragCoord_1;
    let _e206 = uniforms;
    let _e209 = gl_FragCoord_1;
    let _e213 = uniforms;
    let _e219 = cameraRay((vec2<f32>(_e204.x, (_e206.uRes.y - _e209.y)) + _e213.uSample.xy), (&ro_17));
    rd_24 = _e219;
    let _e222 = uniforms;
    rayCone = (1.4f / max(_e222.uRes.y, 2f));
    let _e230 = rayCone;
    let _e231 = rd_24;
    let _e232 = fwidth(_e231);
    rayCone = max(_e230, (length(_e232) * 0.5f));
    let _e237 = rayCone;
    gRayCone = _e237;
    let _e238 = gl_FragCoord_1;
    let _e240 = uniforms;
    let _e245 = textureSampleLevel(uSurfaceHitsTexture, uSurfaceHitsSampler, (_e238.xy / _e240.uRes.xy), 0f);
    surface = _e245;
    let _e247 = surface;
    let _e249 = unpackSurfaceWord(_e247.zw);
    key_5 = _e249;
    let _e251 = surface;
    let _e253 = unpackSurfaceWord(_e251.xy);
    depth_3 = ((_e253 * 24f) / 65535f);
    let _e259 = depth_3;
    let _e260 = key_5;
    hit_3 = vec2<f32>(_e259, floor((_e260 / 100f)));
    let _e266 = key_5;
    if (_e266 > 0f) {
        {
            let _e269 = key_5;
            gForcedCandidate = _e269;
            let _e270 = ro_17;
            let _e271 = rd_24;
            let _e272 = hit_3;
            let _e273 = reliefCandidate(_e270, _e271, _e272);
            c_17 = _e273;
            let _e275 = c_17;
            let _e276 = hit_3;
            let _e278 = candidateNormal(_e275, _e276.x);
            gHitNormal = _e278;
            gHitNormalValid = true;
            let _e280 = ro_17;
            let _e281 = rd_24;
            let _e282 = hit_3;
            gHitPoint = (_e280 + (_e281 * _e282.x));
            let _e286 = c_17;
            let _e288 = c_17;
            let _e290 = hit_3;
            let _e294 = c_17;
            gHitCoordinates = ((_e286.origin + (_e288.direction * _e290.x)) + _e294.pigmentOffset);
            let _e297 = c_17;
            gHitExtent = _e297.extent;
            let _e299 = c_17;
            gHitSeed = _e299.seed;
            let _e301 = hit_3;
            gHitMaterial = _e301.y;
            let _e303 = key_5;
            gHitKey = _e303;
            gForcedCandidate = 0f;
            let _e305 = hit_3;
            let _e307 = rayCone;
            let _e309 = gHitNormal;
            let _e310 = rd_24;
            gReliefFootprint = clamp(((_e305.x * _e307) / max(abs(dot(_e309, _e310)), 0.22f)), 0.0005f, 0.1f);
        }
    }
    let _e324 = hit_3;
    let _e328 = hit_3;
    if ((_e324.y > 0.5f) && (_e328.x < 24f)) {
        {
            let _e333 = ro_17;
            let _e334 = rd_24;
            let _e335 = hit_3;
            p_129 = (_e333 + (_e334 * _e335.x));
            let _e340 = gHitNormal;
            geometric_8 = _e340;
            let _e342 = hit_3;
            let _e344 = rayCone;
            let _e346 = geometric_8;
            let _e347 = rd_24;
            gFootprint = clamp(((_e342.x * _e344) / max(abs(dot(_e346, _e347)), 0.22f)), 0.0005f, 0.1f);
            let _e356 = p_129;
            let _e357 = geometric_8;
            let _e358 = hit_3;
            let _e360 = rd_24;
            let _e361 = shade(_e356, _e357, _e358.y, _e360);
            col_1 = _e361;
        }
    }
    let _e362 = col_1;
    let _e363 = ro_17;
    let _e364 = rd_24;
    let _e365 = hit_3;
    let _e369 = atmosphere(_e362, _e363, _e364, min(_e365.x, 24f));
    col_1 = _e369;
    let _e370 = vUv_1;
    q_19 = (_e370 - vec2(0.5f));
    let _e375 = col_1;
    let _e379 = q_19;
    let _e380 = q_19;
    col_1 = (_e375 * (1f - (smoothstep(0.2f, 0.64f, dot(_e379, _e380)) * 0.12f)));
    let _e387 = col_1;
    lum = dot(_e387, vec3<f32>(0.2126f, 0.7152f, 0.0722f));
    let _e394 = col_1;
    let _e405 = lum;
    col_1 = (_e394 * mix(vec3<f32>(0.97f, 0.99f, 1.035f), vec3<f32>(1.025f, 1f, 0.975f), vec3(smoothstep(0.1f, 0.8f, _e405))));
    let _e410 = col_1;
    let _e411 = uniforms;
    col_1 = (_e410 * max(_e411.uLook.x, 0.5f));
    let _e417 = col_1;
    let _e421 = max(_e417, vec3(0f));
    fragColor = vec4<f32>(_e421.x, _e421.y, _e421.z, 1f);
    return;
}

@fragment
fn main(@location(0) vUv: vec2<f32>, @builtin(position) gl_FragCoord: vec4<f32>) -> FragmentOutput {
    vUv_1 = vUv;
    gl_FragCoord_1 = gl_FragCoord;
    main_1();
    let _e254 = fragColor;
    return FragmentOutput(_e254);
}
