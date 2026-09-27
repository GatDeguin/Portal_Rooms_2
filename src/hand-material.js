export const ATELIER_MATERIAL=`#version 300 es
precision highp float;
in vec3 vP;in vec3 vN;in vec3 vRest;in vec4 vF;
uniform sampler2D uDetail;uniform vec3 uSkin;uniform float uAlpha;uniform int uMaterial;uniform int uQuality;
out vec4 frag;
const float PI=3.14159265359;
vec3 brdf(vec3 n,vec3 v,vec3 l,vec3 albedo,float rough,vec3 radiance,float f0){
 vec3 h=normalize(v+l);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den+.0001);float k=(rough+1.)*(rough+1.)/8.;float G=(nl/(nl*(1.-k)+k))*(nv/(nv*(1.-k)+k));float F=f0+(1.-f0)*pow(1.-vh,5.);
 float spec=D*G*F/max(4.*nl*nv,.001);float wrap=max((dot(n,l)+.15)/1.15,0.);
 return radiance*(albedo*wrap/PI+vec3(spec)*nl);
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec3 n=normalize(vN),v=normalize(vec3(0,0,50)-vP);vec3 p=vRest;bool nail=vF.x>.5;
 vec4 detail=texture(uDetail,vec2((p.x+8.2)/13.2,(p.y+4.)/21.));float pores=uQuality>0?detail.a:.5;float grain=detail.b;float creaseMask=clamp(vF.y,0.,1.);float creases=min(1.4*(detail.r*creaseMask+detail.g*(.22+.78*creaseMask)),1.4);vec3 base=uSkin;
 float palm=clamp(vF.y,0.,1.);base=mix(base,base*vec3(1.04,1.02,.98),palm*.32);
 base*=.94+.10*grain;base*=1.-.14*creases;base=mix(base,base*vec3(1.045,.90,.86),vF.w*.36);
 float rough=.50+.07*(pores-.5);float f0=.028;
 if(uQuality>1&&!nail){float h=detail.a*.003-creases*.007;vec3 dp1=dFdx(vP),dp2=dFdy(vP);vec3 r1=cross(dp2,n),r2=cross(n,dp1);float det=dot(dp1,r1);n=normalize(abs(det)*n-sign(det)*(dFdx(h)*r1+dFdy(h)*r2));}
 if(nail){float edge=smoothstep(.85,.97,vF.z);float moon=(1.-smoothstep(.13,.27,vF.z))*(1.-smoothstep(.12,.46,abs(vF.y-.5)));base=mix(uSkin*vec3(1.08,.93,.93)+.035,vec3(.66,.60,.53),edge*.80);base=mix(base,vec3(.69,.64,.60),moon*.28);rough=.28;f0=.045;}
 if(uMaterial==1){base=vec3(.68,.66,.59);rough=.27;f0=.052;}
 if(uMaterial==2){base=vec3(.065,.15,.13);rough=.31;f0=.18;vec3 grid=abs(fract(p*3.5-.5)-.5)/max(fwidth(p*3.5),vec3(.001));float g=1.-min(min(grid.x,grid.y),grid.z);base+=vec3(.13,.5,.34)*max(g,0.)*.35;}
 vec3 c=base*(.22+.085*n.y)*(1.-.16*vF.z*(nail?0.:1.));c+=brdf(n,v,normalize(vec3(-.6,.8,1.2)),base,rough,vec3(3.5,3.18,2.85),f0);
 c+=brdf(n,v,normalize(vec3(.95,.15,.55)),base,rough,vec3(.68,.84,1.05),f0);
 c+=brdf(n,v,normalize(vec3(.12,.7,-1.)),base,rough,vec3(1.35,1.64,1.58),f0);
 if(uMaterial==0&&!nail){float back=pow(max(dot(-n,normalize(vec3(.1,.7,-1.))),0.),3.);float thin=smoothstep(7.,10.,p.y);c+=vec3(.19,.039,.021)*back*(.3+.7*thin);}
 c=pow(aces(c),vec3(1./2.2));frag=vec4(c,uAlpha);
}`;
