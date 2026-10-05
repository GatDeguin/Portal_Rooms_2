import {movingAt} from './geometry.js';
import {footprint} from './shapes.js';
import {clamp,finite} from './math.js';
import {animatedCubeRotation} from './level-transition.js';
import {lookForRoom} from './campaign.js';
// Four subtle lighting states; presentation only, no level/progression mutation.
const ROOM_LOOKS=[[1.04,0,1],[1.02,-.025,.96],[1.04,.018,1.03],[1.01,-.015,1.08]];

/** One authoritative packing path for GL and GPU; presentation never mutates the scene. */
export function visitSceneUniforms(engine,settings,width,height,reduced,{one,two,four}){
    const s=engine.state,c=s.cube,t=engine.target,room=engine.room;
    const effects=settings.effects!==false&&!reduced?1:0;
    const transition=effects?engine.transition:null;
    four('uTransition',transition?.scale??1,transition?.lift??0,transition?.energy??0,transition?.clock??0);
    const motion=settings.dynamicCamera&&!reduced?1:0,[qx,qy,qz,qw]=c.q;
    const chapter=lookForRoom(room.id??s.level+1);
    four('uLook',...ROOM_LOOKS[chapter],effects);
    const extent=.245*(Math.abs(2*(qx*qy+qw*qz))+Math.abs(1-2*(qx*qx+qz*qz))+Math.abs(2*(qy*qz-qw*qx)));
    two('uRes',width,height);one('uTime',s.time);two('uCube',c.x,c.z);one('uCubeY',c.y+extent-.245);one('uCubeFoot',c.y+(transition?.lift??0));four('uCubeQ',...animatedCubeRotation(c,transition));
    two('uCubeVelocity',c.vx??0,c.vz??0);
    // Film persists in the air; floor contact never leaks through raised platforms.
    four('uSurfaceContact',clamp(c.wetness??0,0,1),clamp(c.slime??0,0,1),c.grounded&&c.y<.045&&(transition?.lift??0)<.001?1:0,clamp(finite(c.slip),0,1));
    two('uStickyStretch',clamp(finite(c.stickyStretch?.x),-1.5,1.5),clamp(finite(c.stickyStretch?.z),-1.5,1.5));
    two('uGravity',s.gravity.x*motion,s.gravity.z*motion);one('uShake',s.shake*motion*effects);one('uMotion',motion);
    two('uTarget',...t.pos);one('uTargetY',t.y??0);one('uTargetType',t.type);one('uHold',clamp(c.hold/.55,0,1));four('uPulse',s.fx.x,s.fx.z,s.fx.life,s.fx.type);
    const boost=(room.zones??[]).find(z=>z.type===3);two('uBoost',boost?.dx??1,boost?.dz??0);
    const zones=[...(room.zones??[])];for(const pad of room.jumpPads??[])if(!zones.some(z=>z.type===5&&z.x===pad.x&&z.z===pad.z))zones.push({...pad,type:5});
    const obstacles=(room.obstacles??[]).map(o=>movingAt(o,s.time)),platforms=(room.platforms??[]).map(p=>movingAt(p,s.time));
    const setGroup=(prefix,count,list,pack)=>{for(let i=0;i<count;i++)four(prefix+i,...(list[i]?pack(list[i]):[0,0,0,0]));};
    setGroup('uObs',6,obstacles,o=>[o.x,o.z,o.w,o.d]);setGroup('uZone',8,zones,z=>[z.x,z.z,Math.max(footprint(z).halfW,footprint(z).halfD),z.type]);
    setGroup('uZoneShape',8,zones,z=>{const f=footprint(z);return [f.halfW,f.halfD,f.corner,f.angle];});
    setGroup('uZoneBasis',8,zones,z=>{const f=footprint(z);return [Math.cos(f.angle),Math.sin(f.angle),0,0];});
    setGroup('uZoneMotion',8,zones,z=>{
      if(z.type!==5)return [0,0,0,0];
      const index=(room.jumpPads??[]).findIndex(p=>p.x===z.x&&p.z===z.z),j=s.jumpJelly?.[index];
      const compression=clamp(finite(j?.compression),-.15,.75),height=.14*(1-compression),r=footprint(z).halfW;
      const radius=(r*r+height*height)/(2*height);
      return [compression,clamp(finite(j?.velocity),-8,8),radius,finite((room.jumpPads??[])[index]?.y,finite(z.y))+.012+height-radius];
    });
    setGroup('uZoneFlow',8,zones,z=>{
      if(z.type!==3)return [0,0,0,0];
      const dx=finite(z.dx,1),dz=finite(z.dz),length=Math.hypot(dx,dz);
      return [length>1e-8?dx/length:1,length>1e-8?dz/length:0,clamp(finite(z.flowSpeed,2.4),0,4),0];
    });
    setGroup('uRamp',3,room.ramps??[],r=>[r.x,r.z,r.w,r.d]);setGroup('uRampMeta',3,room.ramps??[],r=>[r.h,r.dx??0,r.dz??-1,r.base??0]);
    setGroup('uPlat',4,platforms,p=>[p.x,p.z,p.w,p.d]);setGroup('uPlatMeta',4,platforms,p=>[p.h,0,0,0]);
    setGroup('uBump',3,room.bumpers??[],b=>[b.x,b.z,b.r,b.h??.34]);
    setGroup('uBumpFx',3,(room.bumpers??[]).map((_,i)=>s.bumperJelly?.[i]),b=>{
      const dx=b.axisX??1,dz=b.axisZ??0,length=Math.hypot(dx,dz);
      return [clamp(b.compression??0,-.045,.26),clamp(b.velocity??0,-4,4),length>.00001?dx/length:1,length>.00001?dz/length:0];
    });
    // Inverse affine coefficients are uniform over every ray and object query.
    setGroup('uBumpWarp',3,(room.bumpers??[]).map((_,i)=>s.bumperJelly?.[i]),b=>{
      const compression=clamp(b.compression??0,-.045,.26),dx=b.axisX??1,dz=b.axisZ??0,length=Math.hypot(dx,dz);
      if(Math.abs(compression)<.00001)return [0,0,0,0];
      const x=length>.00001?dx/length:1,z=length>.00001?dz/length:0;
      const along=1/(1-compression*.8)-1,across=1/(1+compression*.4)-1;
      return [x*x*along+z*z*across,x*z*(along-across),z*z*along+x*x*across,1/(1+compression*.5)-1];
    });
}
