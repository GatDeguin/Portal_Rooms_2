import {ATELIER_MATERIAL} from './hand-material.js';

// Inverse radial lens matches cameraRay/projectPoint, including resize of the
// worker's last presented bitmap. Both room receivers and skin use this path.
const projection=`
uniform vec3 uOrigin,uRight,uUp,uForward;
uniform vec2 uAspectFov,uJitter;
vec4 projectRoom(vec3 p){
 vec3 d=p-uOrigin;float z=dot(d,uForward);
 vec2 xy=vec2(dot(d,uRight),dot(d,uUp))*uAspectFov.y/max(z,.0001);
 float radius=length(xy),r=radius;
 for(int i=0;i<6;i++)r-=(r+.035*r*r*r-radius)/(1.+.105*r*r);
 xy*=radius>.000001?r/radius:1.;
 xy-=uJitter;xy.x/=uAspectFov.x;
 return vec4(xy*z,1.00417537*z-.10020877,z);
}
// Same ceiling key light as shaders.js. 140-degree perspective covers the room.
vec4 projectLight(vec3 p){
 vec3 d=p-vec3(0.,3.045,-.70);float z=-d.y;
 return vec4(d.x*.363970234,-d.z*.363970234,1.01005025*z-.10050251,z);
}
`;
const shadow=`
uniform sampler2D uShadow;
float handVisibility(vec3 p,float bias){
 vec4 clip=projectLight(p);vec3 q=clip.xyz/clip.w*.5+.5;
 if(clip.w<=0.||any(lessThan(q,vec3(0)))||any(greaterThan(q,vec3(1))))return 1.;
 float visible=0.;vec2 texel=1./vec2(textureSize(uShadow,0));
 float blocker=texture(uShadow,q.xy).r;
 float spread=1.2+min(2.3,max(0.,q.z-blocker)*90.);
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
  float depth=texture(uShadow,q.xy+vec2(x,y)*texel*spread).r;
  visible+=q.z-bias<=depth?1.:0.;
 }
 return visible/9.;
}
`;
export const HAND_VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aJoints;
layout(location=3) in vec4 aWeights;
layout(location=4) in vec4 aFeature;
uniform mat4 uBones[20];
uniform bool uShadowPass;
out vec3 vP,vN,vRest;out vec4 vF;
${projection}
void main(){
 mat4 skin=uBones[int(aJoints.x)]*aWeights.x+uBones[int(aJoints.y)]*aWeights.y+uBones[int(aJoints.z)]*aWeights.z+uBones[int(aJoints.w)]*aWeights.w;
 vec4 p=skin*vec4(aPosition,1.);vP=p.xyz;
 mat3 m=mat3(skin);vec3 c0=cross(m[1],m[2]),c1=cross(m[2],m[0]),c2=cross(m[0],m[1]);float d=dot(m[0],c0);
 vN=abs(d)>.0000001?mat3(c0,c1,c2)*aNormal*(d<0.?-1.:1.):m*aNormal;
 vRest=aPosition;vF=aFeature;
 gl_Position=uShadowPass?projectLight(p.xyz):projectRoom(p.xyz);
}`;
export const SHADOW_FRAGMENT=`#version 300 es
precision highp float;
void main(){}
`;
export const HAND_FRAGMENT=ATELIER_MATERIAL
 .replace('out vec4 frag;',`out vec4 frag;
 uniform vec3 uCamera;uniform float uInteraction;
 ${projection}${shadow}`)
 .replace('vec3(0,0,50)-vP','uCamera-vP')
 .replace('detail.a*.003-creases*.007','detail.a*.00027-creases*.00063')
 .replace('normalize(vec3(-.6,.8,1.2))','normalize(vec3(0.,3.045,-.70)-vP)')
 .replace('vec3(3.5,3.18,2.85)','vec3(3.0,2.72,2.4)*mix(.27,1.,handVisibility(vP,.0007))')
 .replace('normalize(vec3(.95,.15,.55))','normalize(vec3(-1.8,2.6,3.)-vP)')
 .replace('normalize(vec3(.12,.7,-1.))','normalize(vec3(1.92,3.04,-1.15)-vP)')
 .replace('c=pow(aces(c)',`c+=mix(vec3(.03,.17,.13),vec3(.24,.15,.03),step(.5,uInteraction))*uInteraction*.14*pow(1.-max(dot(n,v),0.),3.);
 c=pow(aces(c)`);
export const RECEIVER_VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
out vec3 vP;
${projection}
void main(){vP=aPosition;gl_Position=projectRoom(aPosition);}
`;
export const RECEIVER_FRAGMENT=`#version 300 es
precision highp float;
in vec3 vP;out vec4 frag;
${projection}${shadow}
void main(){
 // Depth is written even outside shadows, so hands sit behind room objects.
 frag=vec4(0.,0.,0.,(1.-handVisibility(vP,.00025))*.42);
}
`;
