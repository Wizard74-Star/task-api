import { useState, useRef, useEffect } from "react";
import * as api from "./src/api";

type Task = api.Task;
type ColorTag = api.ColorTag;

const DEFAULT_COLORS: ColorTag[] = [
  { id:"red",    label:"Urgent",  bg:"#FEE2E2", border:"#EF4444", dot:"#EF4444" },
  { id:"orange", label:"BDA",     bg:"#FEF3C7", border:"#F59E0B", dot:"#F59E0B" },
  { id:"blue",   label:"Home",    bg:"#DBEAFE", border:"#3B82F6", dot:"#3B82F6" },
  { id:"green",  label:"Calls",   bg:"#D1FAE5", border:"#10B981", dot:"#10B981" },
  { id:"purple", label:"Email",   bg:"#EDE9FE", border:"#8B5CF6", dot:"#8B5CF6" },
  { id:"gray",   label:"Other",   bg:"#F3F4F6", border:"#6B7280", dot:"#6B7280" },
];

const PRESET_COLORS = ["#EF4444","#F59E0B","#10B981","#3B82F6","#8B5CF6","#6B7280","#EC4899","#06B6D4","#F97316","#84CC16","#14B8A6","#A855F7"];
const RECUR_OPTIONS = ["none","daily","weekdays","weekly","biweekly","monthly"];
const RECUR_LABELS  = ["None","Daily","Weekdays","Weekly","Bi-weekly","Monthly"];
const SNOOZE_OPTIONS = [
  { label:"30 min",   ms: 30*60*1000 },
  { label:"1 hour",   ms: 60*60*1000 },
  { label:"2 hours",  ms: 2*60*60*1000 },
  { label:"Tomorrow", ms: 24*60*60*1000 },
  { label:"2 days",   ms: 2*24*60*60*1000 },
  { label:"Next week",ms: 7*24*60*60*1000 },
];

const AGE_LEVELS = [
  { mins:0,     label:"",        dust:0, sepia:0,    opacity:1   },
  { mins:30,    label:"30m",     dust:1, sepia:0,    opacity:1   },
  { mins:120,   label:"2h",      dust:2, sepia:0.1,  opacity:.97 },
  { mins:360,   label:"6h",      dust:3, sepia:0.2,  opacity:.94 },
  { mins:1440,  label:"1 day",   dust:4, sepia:0.35, opacity:.88 },
  { mins:4320,  label:"3 days",  dust:5, sepia:0.5,  opacity:.80 },
  { mins:10080, label:"1 week+", dust:6, sepia:0.7,  opacity:.70 },
];
function getAge(ca: number){ const mins=(Date.now()-ca)/60000; let lv=AGE_LEVELS[0]; for(const l of AGE_LEVELS){ if(mins>=l.mins) lv=l; } return {...lv,mins}; }

const LEVELS = Array.from({length:10},(_,i)=>({
  min:i*100,
  color:["#6B7280","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#10B981","#EC4899","#06B6D4","#F97316","#A855F7"][i],
}));
function getLevel(s: number){ let lv=LEVELS[0]; for(const l of LEVELS){ if(s>=l.min) lv=l; } return lv; }
function nextLevel(s: number){ const i=LEVELS.findIndex(l=>l.min>s); return i===-1?null:LEVELS[i]; }

function DustParticles({count}: {count: number}){
  if(!count) return null;
  const particles = Array.from({length:count*3},(_,i)=>({
    w:2+((i*7)%3), h:2+((i*5)%3),
    left:10+(i*37.3)%80, top:5+(i*53.7)%90,
    op:0.15+(count/6)*0.4
  }));
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",borderRadius:10}}>{particles.map((p,i)=><div key={i} style={{position:"absolute",width:p.w,height:p.h,borderRadius:"50%",background:`rgba(180,160,120,${p.op})`,left:`${p.left}%`,top:`${p.top}%`}}/>)}</div>;
}
function AgeTag({age}: {age: {label: string; dust: number}}){ if(!age.label) return null; return <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:`rgba(160,130,80,${Math.min(0.9,0.3+(age.dust/6)*0.6)})`,color:"#fff",letterSpacing:.3}}>🕰 {age.label}</span>; }

function Confetti({x,y,onDone}: {x: number; y: number; onDone: ()=>void}){
  useEffect(()=>{const t=setTimeout(onDone,900);return()=>clearTimeout(t);},[]);
  const pieces = Array.from({length:20},(_,i)=>({
    angle:(i/20)*360,
    color:["#EF4444","#F59E0B","#10B981","#3B82F6","#8B5CF6","#EC4899","#FBBF24"][i%7],
    size:6+(i%6),
    dx:Math.cos((i/20)*360*Math.PI/180)*(60+(i%70)),
    dy:Math.sin((i/20)*360*Math.PI/180)*(60+(i%70)),
  }));
  return <div style={{position:"fixed",left:x,top:y,pointerEvents:"none",zIndex:9999}}>
    <style>{`@keyframes burst{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}`}</style>
    {pieces.map((p,i)=><div key={i} style={{position:"absolute",width:p.size,height:p.size,background:p.color,borderRadius:i%2?"50%":2,animation:"burst 0.8s ease-out forwards",["--dx" as string]:`${p.dx}px`,["--dy" as string]:`${p.dy}px`}}/>)}
  </div>;
}
function ScorePop({x,y,onDone}: {x: number; y: number; onDone: ()=>void}){
  useEffect(()=>{const t=setTimeout(onDone,900);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",left:x-20,top:y-10,pointerEvents:"none",zIndex:9999,fontWeight:800,fontSize:24,color:"#FBBF24",animation:"floatUp 0.9s ease-out forwards"}}>+1⭐<style>{`@keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-70px)}}`}</style></div>;
}

function dueColor(due: string | null): string | null { if(!due) return null; const d=(new Date(due).getTime()-Date.now())/(864e5); if(d<0) return "#EF4444"; if(d<1) return "#F59E0B"; if(d<3) return "#FBBF24"; return "#10B981"; }
function dueLabel(due: string | null): string | null { if(!due) return null; const d=(new Date(due).getTime()-Date.now())/(864e5); if(d<0) return "Overdue!"; if(d<1) return "Due today"; if(d<2) return "Due tomorrow"; return `Due ${new Date(due).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`; }
function snoozeLabel(until: number | null): string | null { if(!until) return null; const d=(until-Date.now())/(60000); if(d<1) return null; if(d<60) return `${Math.round(d)}m`; if(d<1440) return `${Math.round(d/60)}h`; return `${Math.round(d/1440)}d`; }

function SnoozePicker({onSnooze,onClose}: {onSnooze: (until: number)=>void; onClose: ()=>void}){
  useEffect(()=>{
    const handler=(e: MouseEvent)=>{ if(!(e.target as Element).closest("[data-snooze-picker]")) onClose(); };
    setTimeout(()=>document.addEventListener("mousedown",handler),10);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);
  return(
    <div data-snooze-picker="true" style={{position:"absolute",right:0,top:"110%",background:"#1E1E2E",border:"1px solid #3a3a5c",borderRadius:12,padding:"8px 6px",zIndex:200,minWidth:160,boxShadow:"0 8px 24px rgba(0,0,0,.6)"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#555",letterSpacing:.5,padding:"4px 10px 8px"}}>💤 SNOOZE FOR</div>
      {SNOOZE_OPTIONS.map(o=>(
        <button key={o.label} onClick={()=>{onSnooze(Date.now()+o.ms);onClose();}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",color:"#ccc",cursor:"pointer",padding:"8px 12px",fontSize:13,borderRadius:8,fontFamily:"inherit"}}
          onMouseEnter={e=>(e.target as HTMLElement).style.background="#252535"} onMouseLeave={e=>(e.target as HTMLElement).style.background="none"}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorEditor({colors,onChange,onClose}: {colors: ColorTag[]; onChange: (c: ColorTag[])=>void; onClose: ()=>void}){
  const [local,setLocal]=useState(colors.map((c: ColorTag)=>({...c})));
  const [editIdx,setEditIdx]=useState<number | null>(null);
  const update=(i: number,patch: Partial<ColorTag>)=>setLocal(p=>p.map((c,j)=>j===i?{...c,...patch}:c));
  const pickColor=(i: number,hex: string)=>update(i,{border:hex,dot:hex,bg:hex+"22"});
  const addNew=()=>{ const id=`custom${Date.now()}`; setLocal(p=>[...p,{id,label:"New Tag",bg:"#6366F122",border:"#6366F1",dot:"#6366F1"}]); };
  const remove=(i: number)=>setLocal(p=>p.filter((_: ColorTag,j: number)=>j!==i));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a2a",borderRadius:16,padding:28,width:480,maxWidth:"92vw",boxShadow:"0 24px 64px rgba(0,0,0,.6)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:18}}>🎨 Edit Task Tags</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#666",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {local.map((c: ColorTag,i: number)=>(
            <div key={c.id} style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setEditIdx(editIdx===i?null:i)} style={{width:24,height:24,borderRadius:"50%",background:c.border,border:"2px solid rgba(255,255,255,.3)",cursor:"pointer"}} title="Change color"/>
                {editIdx===i&&(
                  <div style={{position:"absolute",left:0,top:"110%",background:"#1E1E2E",border:"1px solid #3a3a5c",borderRadius:10,padding:10,zIndex:100,display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,boxShadow:"0 8px 24px rgba(0,0,0,.5)",width:180}}>
                    {PRESET_COLORS.map(hex=>(
                      <button key={hex} onClick={()=>{pickColor(i,hex);setEditIdx(null);}} style={{width:22,height:22,borderRadius:"50%",background:hex,border:c.border===hex?"2px solid #fff":"2px solid transparent",cursor:"pointer"}}/>
                    ))}
                    <input type="color" value={c.border} onChange={e=>pickColor(i,e.target.value)} style={{width:22,height:22,borderRadius:"50%",border:"none",cursor:"pointer",padding:0,background:"none"}} title="Custom color"/>
                  </div>
                )}
              </div>
              <input value={c.label} onChange={e=>update(i,{label:e.target.value})} style={{flex:1,background:"transparent",border:"none",fontSize:14,fontWeight:700,color:"#1a1a2e",outline:"none",fontFamily:"inherit"}} maxLength={20}/>
              <span style={{fontSize:11,color:c.border,fontWeight:600,flexShrink:0}}>{c.border}</span>
              {local.length>1&&<button onClick={()=>remove(i)} style={{background:"none",border:"none",color:"rgba(0,0,0,.25)",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>}
            </div>
          ))}
        </div>
        <button onClick={addNew} style={{width:"100%",background:"rgba(99,102,241,.15)",color:"#a5b4fc",border:"1px dashed #6366F1",borderRadius:10,padding:"10px 0",fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:16}}>+ Add New Tag</button>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,background:"#252535",color:"#888",border:"none",borderRadius:8,padding:"10px 0",fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>{onChange(local);onClose();}} style={{flex:2,background:"#6366F1",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer",fontSize:14}}>Save Tags</button>
        </div>
      </div>
    </div>
  );
}

function TaskDrawer({task,colors,onClose,onUpdate,onComplete,onSnooze}: {task: Task; colors: ColorTag[]; onClose: ()=>void; onUpdate: (id: string,patch: Partial<Task>)=>void; onComplete: (id: string,e?: React.MouseEvent)=>void; onSnooze: (id: string,until: number)=>void}){
  const c=colors.find((x: ColorTag)=>x.id===task.color)||colors[0];
  const [notes,setNotes]=useState(task.notes||"");
  const [newSub,setNewSub]=useState("");
  const [editText,setEditText]=useState(task.text);
  const [editDue,setEditDue]=useState(task.due||"");
  const [showSnooze,setShowSnooze]=useState(false);
  const save=(patch={})=>onUpdate(task.id,{notes,text:editText,due:editDue||null,...patch});
  const addSub=()=>{ if(!newSub.trim()) return; onUpdate(task.id,{subtasks:[...task.subtasks,{id:`s${Date.now()}`,text:newSub.trim(),done:false}]}); setNewSub(""); };
  const toggleSub=(sid: string)=>onUpdate(task.id,{subtasks:task.subtasks.map(s=>s.id===sid?{...s,done:!s.done}:s)});
  const deleteSub=(sid: string)=>onUpdate(task.id,{subtasks:task.subtasks.filter(s=>s.id!==sid)});
  const doneCount=task.subtasks.filter((s: {done: boolean})=>s.done).length;
  const age=getAge(task.createdAt);
  const dl=dueLabel(task.due); const dc=dueColor(task.due);
  const sl=task.snoozedUntil?snoozeLabel(task.snoozedUntil):null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex"}} onClick={onClose}>
      <div style={{flex:1,background:"rgba(0,0,0,.5)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{width:430,background:"#1a1a2a",height:"100%",overflowY:"auto",boxShadow:"-8px 0 32px rgba(0,0,0,.5)",display:"flex",flexDirection:"column"}}>
        <div style={{background:c.bg,padding:"20px 20px 16px",borderBottom:`3px solid ${c.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} onBlur={()=>save()} style={{flex:1,background:"transparent",border:"none",fontSize:16,fontWeight:700,color:"#1a1a2e",resize:"none",outline:"none",lineHeight:1.4,fontFamily:"inherit"}} rows={2}/>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button onClick={()=>onUpdate(task.id,{starred:!task.starred})} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",opacity:task.starred?1:.3}}>⭐</button>
              <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#999",cursor:"pointer"}}>×</button>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,color:c.border}}>{c.label}</span>
            <AgeTag age={age}/>
            {dl&&dc&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:dc,color:"#fff"}}>📅 {dl}</span>}
            {sl&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:"#312e81",color:"#a5b4fc"}}>💤 {sl}</span>}
            <input type="date" value={editDue} onChange={e=>{setEditDue(e.target.value);onUpdate(task.id,{due:e.target.value||null});}} style={{fontSize:11,border:"1px solid rgba(0,0,0,.15)",borderRadius:6,padding:"2px 6px",background:"rgba(255,255,255,.5)",color:"#1a1a2e"}}/>
          </div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"#888"}}>🔁</span>
            <select value={task.recur||"none"} onChange={e=>onUpdate(task.id,{recur:e.target.value})} style={{background:"rgba(255,255,255,.5)",border:"1px solid rgba(0,0,0,.15)",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#1a1a2e",cursor:"pointer"}}>
              {RECUR_OPTIONS.map((o,i)=><option key={o} value={o}>{RECUR_LABELS[i]}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={e=>onComplete(task.id,e)} style={{flex:1,background:task.done?"#10B981":"#1E1E2E",color:"#fff",border:"none",borderRadius:8,padding:"7px 0",fontWeight:700,cursor:"pointer",fontSize:13}}>{task.done?"✓ Done — undo":"Mark Complete"}</button>
            <div style={{position:"relative"}} data-snooze-picker="true">
              <button onClick={()=>setShowSnooze(s=>!s)} style={{background:"#312e81",color:"#a5b4fc",border:"none",borderRadius:8,padding:"7px 14px",fontWeight:700,cursor:"pointer",fontSize:13}}>💤 Snooze</button>
              {showSnooze&&<SnoozePicker onSnooze={(until: number)=>onSnooze(task.id,until)} onClose={()=>setShowSnooze(false)}/>}
            </div>
          </div>
        </div>
        <div style={{flex:1,padding:20,display:"flex",flexDirection:"column",gap:20}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:800,color:"#aaa",letterSpacing:.5}}>SUBTASKS</span>
              {task.subtasks.length>0&&<span style={{fontSize:11,color:"#555"}}>{doneCount}/{task.subtasks.length} done</span>}
            </div>
            {task.subtasks.length>0&&<div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"4px 0",marginBottom:10}}>
              <div style={{height:3,background:"rgba(255,255,255,.07)",borderRadius:2,margin:"0 12px 8px"}}><div style={{height:"100%",background:c.border,borderRadius:2,width:`${(doneCount/task.subtasks.length)*100}%`,transition:"width .3s"}}/></div>
              {task.subtasks.map((s: {id: string; text: string; done: boolean})=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <input type="checkbox" checked={s.done} onChange={()=>toggleSub(s.id)} style={{accentColor:c.border,width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                  <span style={{flex:1,fontSize:13,color:s.done?"#444":"#ccc",textDecoration:s.done?"line-through":"none"}}>{s.text}</span>
                  <button onClick={()=>deleteSub(s.id)} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:14,padding:0}}>×</button>
                </div>
              ))}
            </div>}
            <div style={{display:"flex",gap:6}}>
              <input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="Add a subtask..." onKeyDown={e=>{if(e.key==="Enter") addSub();}} style={{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid #2a2a40",borderRadius:8,padding:"8px 10px",color:"#fff",fontSize:13,outline:"none"}}/>
              <button onClick={addSub} style={{background:"#6366F1",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:13}}>+</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:10}}>NOTES</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} onBlur={()=>save()} placeholder="Add notes, context, links..." rows={6} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid #2a2a40",borderRadius:8,padding:"10px 12px",color:"#ccc",fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.6,outline:"none"}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryModal({tasks,score,highScore,streak,history,onClose}: {tasks: Task[]; score: number; highScore: number; streak: number; history: Record<string,number>; onClose: ()=>void}){
  const today=new Date().toISOString().slice(0,10);
  const todayDone=tasks.filter((t: Task)=>t.done&&t.completedAt&&new Date(t.completedAt).toISOString().slice(0,10)===today);
  const weeks=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); weeks.push(d.toISOString().slice(0,10)); }
  const ws=weeks.map(k=>({day:new Date(k).toLocaleDateString("en-US",{weekday:"short"}),score:history[k]||0,isToday:k===today}));
  const wb=Math.max(...ws.map(w=>w.score),1);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a2a",borderRadius:16,padding:32,width:460,maxWidth:"90vw",boxShadow:"0 24px 64px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontWeight:800,fontSize:20}}>📊 Your Day</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#666",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:24}}>
          {([["Crushed",todayDone.length,"#10B981"],["Score",score,"#FBBF24"],["Best",highScore,"#8B5CF6"],["Streak",`${streak}🔥`,"#EF4444"]] as [string,string|number,string][]).map(([l,v,col])=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,.04)",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:col}}>{v}</div>
              <div style={{fontSize:10,color:"#555",marginTop:2,fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:12}}>THIS WEEK</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:80}}>
            {ws.map(w=>(
              <div key={w.day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:10,fontWeight:700,color:w.score>0?"#FBBF24":"#444"}}>{w.score||""}</div>
                <div style={{width:"100%",background:w.isToday?"#6366F1":w.score>0?"#2a3a6a":"rgba(255,255,255,.05)",borderRadius:"4px 4px 0 0",height:`${Math.max(4,(w.score/wb)*52)}px`,border:w.isToday?"1px solid #818CF8":"none"}}/>
                <div style={{fontSize:10,color:w.isToday?"#818CF8":"#444",fontWeight:w.isToday?700:400}}>{w.day}</div>
              </div>
            ))}
          </div>
        </div>
        {todayDone.length>0&&<div>
          <div style={{fontSize:12,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:8}}>COMPLETED TODAY</div>
          <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
            {todayDone.map((t: Task)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.03)",borderRadius:8,padding:"6px 10px"}}>
                <span style={{flex:1,fontSize:12,color:"#888",textDecoration:"line-through"}}>{t.text}</span>
                <span style={{fontSize:11,color:"#FBBF24",fontWeight:700}}>+{t.points||1}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>
    </div>
  );
}

const now=()=>Date.now();
let idC=20; const uid=()=>`t${++idC}`;

export default function App(){
  const INIT_TASKS: Task[] = [
    {id:"t1",text:"Find some networks for the BDA call",color:"orange",done:false,bucket:"urgent",points:1,createdAt:now()-25*60000,due:null,notes:"",subtasks:[],recur:"none",completedAt:null,snoozedUntil:null,starred:false},
    {id:"t2",text:"Email the AM call contacts",color:"purple",done:false,bucket:"urgent",points:2,createdAt:now()-90*60000,due:null,notes:"",subtasks:[],recur:"none",completedAt:null,snoozedUntil:null,starred:false},
    {id:"t3",text:"Fw: Eitan Benay contract review",color:"red",done:false,bucket:"urgent",points:3,createdAt:now()-200*60000,due:null,notes:"Check section 4",subtasks:[{id:"s1",text:"Read section 4",done:false},{id:"s2",text:"Reply with comments",done:false}],recur:"none",completedAt:null,snoozedUntil:null,starred:true},
    {id:"t4",text:"Voicemails — return all 3",color:"green",done:false,bucket:"tasks",points:1,createdAt:now()-400*60000,due:null,notes:"",subtasks:[],recur:"daily",completedAt:null,snoozedUntil:null,starred:false},
    {id:"t5",text:"Call Natalia 437-972-3...",color:"green",done:false,bucket:"tasks",points:1,createdAt:now()-1500*60000,due:null,notes:"",subtasks:[],recur:"none",completedAt:null,snoozedUntil:null,starred:false},
    {id:"t6",text:"Pick up dry cleaning",color:"blue",done:false,bucket:"procrastinating",points:1,createdAt:now()-5000*60000,due:null,notes:"",subtasks:[],recur:"none",completedAt:null,snoozedUntil:null,starred:false},
    {id:"t7",text:"Credit card bill",color:"blue",done:false,bucket:"procrastinating",points:2,createdAt:now()-11000*60000,due:null,notes:"",subtasks:[{id:"s3",text:"Log into RBC",done:false},{id:"s4",text:"Pay Visa",done:false},{id:"s5",text:"Pay Amex",done:false}],recur:"monthly",completedAt:null,snoozedUntil:null,starred:false},
  ];

  const [colors,setColors]=useState<ColorTag[]>(DEFAULT_COLORS);
  const [tasks,setTasks]=useState<Task[]>(INIT_TASKS);
  const [session,setSession]=useState<string[]>([]);
  const [tab,setTab]=useState("tasks");
  const [addPanel,setAddPanel]=useState("quick");
  const [newText,setNewText]=useState("");
  const [newColor,setNewColor]=useState("gray");
  const [newBucket,setNewBucket]=useState("urgent");
  const [newDue,setNewDue]=useState("");
  const [newRecur,setNewRecur]=useState("none");
  const [gmailText,setGmailText]=useState("");
  const [smsText,setSmsText]=useState("");
  const [pomoActive,setPomoActive]=useState(false);
  const [pomoSecs,setPomoSecs]=useState(25*60);
  const [pomoPhase,setPomoPhase]=useState("work");
  const [pomoIdx,setPomoIdx]=useState(0);
  const [dragId,setDragId]=useState<string | null>(null);
  const [dragOver,setDragOver]=useState<string | null>(null);
  const [dragCtx,setDragCtx]=useState<string | null>(null);
  const [listening,setListening]=useState(false);
  const [particles,setParticles]=useState<{id: number; x: number; y: number}[]>([]);
  const [score,setScore]=useState(0);
  const [highScore,setHighScore]=useState(0);
  const [streak,setStreak]=useState(0);
  const [blurHome,setBlurHome]=useState(false);
  const [openTask,setOpenTask]=useState<Task | null>(null);
  const [showSummary,setShowSummary]=useState(false);
  const [showColorEditor,setShowColorEditor]=useState(false);
  const [search,setSearch]=useState("");
  const [showSearch,setShowSearch]=useState(false);
  const [scoreHistory,setScoreHistory]=useState<Record<string,number>>({});
  const [showSnoozed,setShowSnoozed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState<string|null>(null);
  const searchRef=useRef(null);
  const timerRef=useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedRef=useRef(false);

  useEffect(()=>{
    api.fetchData().then((data)=>{
      setTasks(data.tasks.length?data.tasks:INIT_TASKS);
      setColors(data.colors.length?data.colors:DEFAULT_COLORS);
      setScoreHistory(data.scoreHistory||{});
      const today=new Date().toISOString().slice(0,10);
      const todayScore=data.scoreHistory?.[today]??0;
      setScore(todayScore);
      const values=Object.values(data.scoreHistory||{});
      setHighScore(values.length?Math.max(...values):0);
      hasLoadedRef.current=true;
    }).catch((err)=>{ setLoadError(err.message||"Failed to load"); setTasks(INIT_TASKS); setColors(DEFAULT_COLORS); hasLoadedRef.current=true; }).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!hasLoadedRef.current) return;
    const id=setInterval(()=>{
      api.fetchData().then((data)=>{ setTasks(data.tasks); setColors(c=>c.length?data.colors:c); setScoreHistory(data.scoreHistory||{}); const today=new Date().toISOString().slice(0,10); setScore(s=>data.scoreHistory?.[today]??s); setHighScore(h=>{ const v=Object.values(data.scoreHistory||{}); return v.length?Math.max(...v):h; }); }).catch(()=>{});
    },3000);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{ const k=new Date().toISOString().slice(0,10); setScoreHistory(h=>({...h,[k]:score})); },[score]);

  useEffect(()=>{
    if(!hasLoadedRef.current) return;
    api.saveScoreHistory(scoreHistory).catch(()=>{});
  },[scoreHistory]);

  useEffect(()=>{
    if(pomoActive){ timerRef.current=setInterval(()=>setPomoSecs((s: number)=>{ if(s<=1){setPomoPhase((p: string)=>p==="work"?"break":"work");return(pomoPhase==="work"?5:25)*60;} return s-1; }),1000); }
    else if(timerRef.current) clearInterval(timerRef.current);
    return()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[pomoActive,pomoPhase]);

  const fmt=(s: number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const spawn=(e: React.SyntheticEvent)=>{ const r=(e.target as HTMLElement).getBoundingClientRect(); const id=Date.now(); setParticles(p=>[...p,{id,x:r.left+r.width/2,y:r.top+r.height/2}]); };
  const colorMap=Object.fromEntries(colors.map(c=>[c.id,c]));

  const addTask=(text: string,color=newColor,bucket=newBucket,due=newDue||null,recur=newRecur)=>{
    if(!text.trim()) return;
    const newTask={id:uid(),text:text.trim(),color,done:false,bucket,points:1,createdAt:now(),due,notes:"",subtasks:[],recur,completedAt:null,snoozedUntil:null,starred:false};
    setTasks(p=>[...p,newTask]);
    setNewText(""); setNewDue(""); setNewRecur("none");
    api.createTask(newTask).catch(()=>{});
  };
  const updateTask=(id: string,patch: Partial<Task>)=>{ setTasks(p=>p.map(t=>t.id===id?{...t,...patch}:t)); api.updateTask(id,patch).catch(()=>{}); };
  const snoozeTask=(id: string,until: number)=>updateTask(id,{snoozedUntil:until});
  const unsnooze=(id: string)=>updateTask(id,{snoozedUntil:null});
  const cyclePoints=(id: string,e: React.MouseEvent)=>{ e.stopPropagation(); const task=tasks.find(t=>t.id===id); if(!task) return; const newPoints=(task.points??1)>=5?1:(task.points??1)+1; setTasks(p=>p.map(t=>t.id===id?{...t,points:newPoints}:t)); api.updateTask(id,{points:newPoints}).catch(()=>{}); };
  const completeTask=(id: string,e?: React.SyntheticEvent)=>{
    e?.stopPropagation?.();
    const task=tasks.find(t=>t.id===id); if(!task) return;
    if(!task.done){
      if(e) spawn(e);
      const ns=score+(task.points||1);
      setScore(ns); setStreak(s=>s+1); if(ns>highScore) setHighScore(ns);
      if(task.recur&&task.recur!=="none"){
        setTasks(p=>p.map(t=>t.id===id?{...t,done:true,completedAt:now()}:t));
        setTimeout(()=>setTasks(p=>p.map(t=>t.id===id?{...t,done:false,completedAt:null,createdAt:now(),subtasks:t.subtasks.map(s=>({...s,done:false}))}:t)),2000);
        return;
      }
    } else { setScore((s: number)=>Math.max(0,s-(task.points||1))); setStreak(0); }
    setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done,completedAt:(!t.done?now():null) as number | null}:t));
  };
  const deleteTask=(id: string)=>{ setTasks(p=>p.filter(t=>t.id!==id)); setSession(p=>p.filter(i=>i!==id)); if(openTask?.id===id) setOpenTask(null); api.deleteTask(id).catch(()=>{}); };

  const onDragStartTask=(e: React.DragEvent,id: string,ctx: string)=>{ setDragId(id); setDragCtx(ctx); e.dataTransfer.effectAllowed="move"; };
  const onDragOverTask=(e: React.DragEvent,id: string)=>{ e.preventDefault(); setDragOver(id); };
  const onDropTask=(e: React.DragEvent,targetId: string,bucket: string)=>{
    e.preventDefault(); e.stopPropagation();
    if(!dragId||dragId===targetId){setDragId(null);setDragOver(null);return;}
    if(dragCtx==="col"){ setTasks(prev=>{ const arr=[...prev]; const fi=arr.findIndex(t=>t.id===dragId); const ti=arr.findIndex(t=>t.id===targetId); const [mv]=arr.splice(fi,1); mv.bucket=bucket; arr.splice(ti,0,mv); return arr; }); api.updateTask(dragId,{bucket}).catch(()=>{}); }
    setDragId(null); setDragOver(null);
  };
  const onDropSession=(e: React.DragEvent)=>{ e.preventDefault(); if(dragId&&!session.includes(dragId)) setSession(p=>[...p,dragId]); setDragId(null); };
  const onDropColEmpty=(e: React.DragEvent,bucket: string)=>{ e.preventDefault(); if(dragId&&dragCtx==="col"){ setTasks(p=>p.map(t=>t.id===dragId?{...t,bucket}:t)); api.updateTask(dragId,{bucket}).catch(()=>{}); } setDragId(null); };
  const removeFromSession=(id: string)=>setSession(p=>p.filter(i=>i!==id));
  const lv=getLevel(score); const nxtLv=nextLevel(score);
  const activeFn=(t: Task)=>!t.done&&(!t.snoozedUntil||t.snoozedUntil<=now());
  const snoozedTasks=tasks.filter(t=>!t.done&&t.snoozedUntil&&t.snoozedUntil>now());
  const searchResults=search.trim().length>1?tasks.filter(t=>t.text.toLowerCase().includes(search.toLowerCase())||t.notes?.toLowerCase().includes(search.toLowerCase())):[];

  const TaskCard=({task,bucket}: {task: Task; bucket: string})=>{
    const c=colorMap[task.color]||colors[0];
    const age=getAge(task.createdAt);
    const pts=task.points||1;
    const isHome=task.color==="blue";
    const dc=dueColor(task.due); const dl=dueLabel(task.due);
    const subDone=task.subtasks.filter((s: {done: boolean})=>s.done).length;
    const subTotal=task.subtasks.length;
    const [showSnooze,setShowSnooze]=useState(false);
    return(
      <div draggable onDragStart={e=>onDragStartTask(e,task.id,"col")} onDragOver={e=>onDragOverTask(e,task.id)} onDrop={e=>onDropTask(e,task.id,bucket)}
        onClick={()=>setOpenTask(task)}
        style={{position:"relative",background:c.bg,border:`1.5px solid ${task.due&&new Date(task.due).getTime()<Date.now()&&!task.done?"#EF4444":c.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8,cursor:"pointer",boxShadow:dragOver===task.id?"0 0 0 2px #6366F1":"0 1px 4px rgba(0,0,0,.07)",filter:`sepia(${age.sepia})`,opacity:age.opacity,transition:"box-shadow .15s,transform .1s",userSelect:"none"}}
        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
        <DustParticles count={age.dust}/>
        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
          <input type="checkbox" checked={task.done} onChange={e=>{e.stopPropagation();completeTask(task.id,e);}} onClick={e=>e.stopPropagation()} style={{marginTop:3,accentColor:c.border,width:16,height:16,cursor:"pointer",flexShrink:0}}/>
          <div style={{flex:1,filter:blurHome&&isHome?"blur(5px)":"none",transition:"filter .3s"}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1a1a2e",lineHeight:1.45,textDecoration:task.done?"line-through":"none"}}>{task.starred&&<span style={{marginRight:4}}>⭐</span>}{task.text}</div>
            <div style={{display:"flex",gap:5,alignItems:"center",marginTop:4,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:c.border,fontWeight:600}}>{c.label}</span>
              <AgeTag age={age}/>
              {dl&&dc&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:dc,color:"#fff"}}>📅 {dl}</span>}
              {task.recur&&task.recur!=="none"&&<span style={{fontSize:10,color:"#818CF8",fontWeight:600}}>🔁</span>}
              {subTotal>0&&<span style={{fontSize:10,color:"#888",fontWeight:600}}>◻ {subDone}/{subTotal}</span>}
              {task.notes?.trim()&&<span style={{fontSize:10,color:"#999"}}>📝</span>}
            </div>
            {subTotal>0&&<div style={{height:2,background:"rgba(0,0,0,.1)",borderRadius:1,marginTop:5}}><div style={{height:"100%",background:c.border,borderRadius:1,width:`${(subDone/subTotal)*100}%`,transition:"width .3s"}}/></div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end",flexShrink:0}}>
            <button onClick={e=>{e.stopPropagation();cyclePoints(task.id,e);}} style={{background:pts>1?"#FBBF24":"rgba(0,0,0,0.06)",border:pts>1?"1.5px solid #F59E0B":"1px solid rgba(0,0,0,.1)",borderRadius:20,color:pts>1?"#92400e":"#aaa",cursor:"pointer",fontSize:10,fontWeight:700,padding:"2px 6px"}}>{pts>1?`⭐×${pts}`:"⭐"}</button>
            <div style={{position:"relative"}} data-snooze-picker="true">
              <button onClick={e=>{e.stopPropagation();setShowSnooze(s=>!s);}} style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:13,padding:"1px 0"}}>💤</button>
              {showSnooze&&<div onClick={e=>e.stopPropagation()}><SnoozePicker onSnooze={(until: number)=>snoozeTask(task.id,until)} onClose={()=>setShowSnooze(false)}/></div>}
            </div>
            <button onClick={e=>{e.stopPropagation();deleteTask(task.id);}} style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>×</button>
          </div>
        </div>
      </div>
    );
  };

  const BucketCol=({bucket}: {bucket: {id: string; label: string}})=>{
    const bTasks=tasks.filter(t=>t.bucket===bucket.id&&activeFn(t));
    const done=tasks.filter(t=>t.bucket===bucket.id&&t.done);
    const META: Record<string,{accent: string; emoji: string}>= {urgent:{accent:"#EF4444",emoji:"🔥"},tasks:{accent:"#6366F1",emoji:"📋"},procrastinating:{accent:"#F59E0B",emoji:"😬"}};
    const m=META[bucket.id]||{accent:"#aaa",emoji:"📌"};
    return(
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"10px 14px",background:"#1E1E2E",borderRadius:"10px 10px 0 0"}}>
          <span style={{fontSize:18}}>{m.emoji}</span>
          <span style={{fontWeight:800,fontSize:13,color:m.accent,letterSpacing:.5,flex:1}}>{bucket.label.toUpperCase()}</span>
          <span style={{background:m.accent,color:"#fff",borderRadius:20,fontSize:11,fontWeight:700,padding:"1px 8px"}}>{bTasks.length}</span>
          {bucket.id==="tasks"&&<button onClick={()=>setBlurHome(b=>!b)} style={{background:blurHome?"#3B82F6":"rgba(255,255,255,.1)",border:"none",borderRadius:6,color:"#fff",cursor:"pointer",fontSize:12,padding:"3px 8px",fontWeight:600}}>{blurHome?"👁":"🙈"}</button>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"0 4px 4px",minHeight:80}} onDragOver={e=>e.preventDefault()} onDrop={e=>onDropColEmpty(e,bucket.id)}>
          {bTasks.length===0&&<div style={{fontSize:12,color:"#555",padding:"16px 4px",textAlign:"center"}}>All clear! 🎉</div>}
          {bTasks.map(t=><TaskCard key={t.id} task={t} bucket={bucket.id}/>)}
          {done.length>0&&<div style={{marginTop:10}}>
            <div style={{fontSize:11,color:"#444",fontWeight:700,marginBottom:6}}>✓ DONE</div>
            {done.map(t=>(
                <div key={t.id} onClick={()=>setOpenTask(t as Task)} style={{background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"7px 12px",marginBottom:6,display:"flex",alignItems:"center",gap:8,opacity:.45,cursor:"pointer"}}>
                <input type="checkbox" checked onChange={e=>{e.stopPropagation();completeTask(t.id,e);}} onClick={e=>e.stopPropagation()} style={{width:16,height:16,cursor:"pointer"}}/>
                <span style={{flex:1,fontSize:12,textDecoration:"line-through",color:"#555"}}>{t.text}</span>
                <button onClick={e=>{e.stopPropagation();deleteTask(t.id);}} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:16}}>×</button>
              </div>
            ))}
          </div>}
        </div>
      </div>
    );
  };

  const BUCKETS=[{id:"urgent",label:"Urgent"},{id:"tasks",label:"Tasks"},{id:"procrastinating",label:"Stop Procrastinating"}];

  const TimerTaskPanel=({taskId}: {taskId: string | undefined})=>{
    const task=tasks.find(t=>t.id===taskId);
    if(!task) return <div style={{color:"#444",fontSize:13,textAlign:"center",background:"#1a1a2a",borderRadius:12,height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>← Select a task from the queue</div>;
    const c=colorMap[task.color]||colors[0];
    const pts=task.points||1;
    const subDone=task.subtasks.filter(s=>s.done).length;
    const [showSnooze,setShowSnooze]=useState(false);
    const [newSub,setNewSub]=useState("");
    const addSub=()=>{ if(!newSub.trim()) return; updateTask(task.id,{subtasks:[...task.subtasks,{id:`s${Date.now()}`,text:newSub.trim(),done:false}]}); setNewSub(""); };
    return(
      <div style={{background:"#1a1a2a",borderRadius:12,overflow:"hidden",height:"100%",display:"flex",flexDirection:"column"}}>
        <div style={{background:c.bg,padding:"16px 18px",borderBottom:`3px solid ${c.border}`}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1a1a2e",lineHeight:1.4}}>{task.starred&&<span style={{marginRight:4}}>⭐</span>}{task.text}</div>
              <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:c.border}}>{c.label}</span>
                {task.due&&dueColor(task.due)&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,background:dueColor(task.due)!,color:"#fff"}}>📅 {dueLabel(task.due)}</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>updateTask(task.id,{starred:!task.starred})} style={{background:"rgba(0,0,0,.1)",border:"none",borderRadius:6,fontSize:14,padding:"4px 7px",cursor:"pointer",opacity:task.starred?1:.4}}>⭐</button>
              <button onClick={e=>cyclePoints(task.id,e)} style={{background:pts>1?"#FBBF24":"rgba(0,0,0,.1)",border:pts>1?"1.5px solid #F59E0B":"none",borderRadius:20,color:pts>1?"#92400e":"#888",cursor:"pointer",fontSize:10,fontWeight:700,padding:"4px 8px"}}>{pts>1?`⭐×${pts}`:"⭐"}</button>
              <div style={{position:"relative"}} data-snooze-picker="true">
                <button onClick={()=>setShowSnooze(s=>!s)} style={{background:"rgba(0,0,0,.1)",border:"none",borderRadius:6,fontSize:14,padding:"4px 7px",cursor:"pointer"}}>💤</button>
                {showSnooze&&<SnoozePicker onSnooze={(until: number)=>{snoozeTask(task.id,until);removeFromSession(task.id);}} onClose={()=>setShowSnooze(false)}/>}
              </div>
            </div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:800,color:"#aaa",letterSpacing:.5}}>SUBTASKS</span>
              {task.subtasks.length>0&&<span style={{fontSize:11,color:"#555"}}>{subDone}/{task.subtasks.length}</span>}
            </div>
            {task.subtasks.length>0&&<div style={{height:3,background:"rgba(255,255,255,.07)",borderRadius:2,marginBottom:8}}><div style={{height:"100%",background:c.border,borderRadius:2,width:`${(subDone/task.subtasks.length)*100}%`,transition:"width .3s"}}/></div>}
            {task.subtasks.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <input type="checkbox" checked={s.done} onChange={()=>updateTask(task.id,{subtasks:task.subtasks.map(sub=>sub.id===s.id?{...sub,done:!sub.done}:sub)})} style={{accentColor:c.border,width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                <span style={{flex:1,fontSize:13,color:s.done?"#444":"#ccc",textDecoration:s.done?"line-through":"none"}}>{s.text}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="Add subtask..." onKeyDown={e=>{if(e.key==="Enter") addSub();}} style={{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid #2a2a40",borderRadius:7,padding:"6px 10px",color:"#fff",fontSize:12,outline:"none"}}/>
              <button onClick={addSub} style={{background:"#6366F1",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer"}}>+</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:8}}>NOTES</div>
            <textarea value={task.notes||""} onChange={e=>updateTask(task.id,{notes:e.target.value})} placeholder="Notes, links, context..." rows={5} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid #2a2a40",borderRadius:8,padding:"10px",color:"#ccc",fontSize:12,resize:"none",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.5,outline:"none"}}/>
          </div>
        </div>
      </div>
    );
  };

  const liveOpenTask=openTask?tasks.find(t=>t.id===openTask.id):null;

  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:"#12121E",height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden",color:"#fff"}}>
      {loading&&<div style={{background:"#6366F1",color:"#fff",padding:"6px 20px",fontSize:12,fontWeight:700,textAlign:"center"}}>Loading...</div>}
      {loadError&&<div style={{background:"#EF4444",color:"#fff",padding:"6px 20px",fontSize:12,textAlign:"center"}}>{loadError} — using local data.</div>}
      {particles.map(p=><Confetti key={p.id} x={p.x} y={p.y} onDone={()=>setParticles(q=>q.filter(r=>r.id!==p.id))}/>)}
      {particles.map(p=><ScorePop key={`s${p.id}`} x={p.x} y={p.y} onDone={()=>{}}/>)}
      {liveOpenTask&&<TaskDrawer task={liveOpenTask} colors={colors} onClose={()=>setOpenTask(null)} onUpdate={updateTask} onComplete={completeTask} onSnooze={snoozeTask}/>}
      {showSummary&&<SummaryModal tasks={tasks} score={score} highScore={highScore} streak={streak} history={scoreHistory} onClose={()=>setShowSummary(false)}/>}
      {showColorEditor&&<ColorEditor colors={colors} onChange={(newColors: ColorTag[])=>{ setColors(newColors); api.saveColors(newColors).catch(()=>{}); }} onClose={()=>setShowColorEditor(false)}/>}

      {showSearch&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:80}} onClick={()=>{setShowSearch(false);setSearch("");}}>
          <div onClick={e=>e.stopPropagation()} style={{width:500,maxWidth:"90vw"}}>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks and notes..." style={{width:"100%",background:"#1a1a2a",border:"2px solid #6366F1",borderRadius:12,padding:"14px 18px",fontSize:16,color:"#fff",outline:"none",boxSizing:"border-box"}}/>
            {searchResults.length>0&&<div style={{background:"#1a1a2a",borderRadius:12,marginTop:8,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
              {searchResults.map(t=>{ const c=colorMap[t.color]||colors[0]; return(
                <div key={t.id} onClick={()=>{setOpenTask(t);setShowSearch(false);setSearch("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:"1px solid #252535",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#252535"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:c.dot,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:14,color:"#ccc"}}>{t.text}</span>
                  <span style={{fontSize:11,color:c.border,fontWeight:600}}>{c.label}</span>
                </div>
              );})}
            </div>}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{background:"#1E1E2E",padding:"10px 20px",display:"flex",alignItems:"center",gap:14,borderBottom:"1px solid #2a2a40",flexShrink:0}}>
        <div style={{minWidth:110}}>
          <div style={{fontWeight:800,fontSize:20,letterSpacing:-.5}}>⚡ Scott's T2D</div>
          <div style={{fontSize:11,color:"#555"}}>{tasks.filter(activeFn).length} remaining</div>
        </div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#555",fontWeight:700,letterSpacing:.5}}>TODAY</div><div style={{fontSize:26,fontWeight:800,color:"#FBBF24",lineHeight:1}}>{score}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#555",fontWeight:700,letterSpacing:.5}}>BEST</div><div style={{fontSize:26,fontWeight:800,color:"#10B981",lineHeight:1}}>{highScore}</div></div>
          {streak>=3&&<div style={{fontSize:18,opacity:.7}}>🔥</div>}
          {(()=>{ const pct=nxtLv?(score-lv.min)/100:1; const r=14,circ=2*Math.PI*r,dash=pct*circ; return(
            <div style={{position:"relative",width:36,height:36,flexShrink:0}}>
              <svg width="36" height="36" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
                <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3"/>
                <circle cx="18" cy="18" r={r} fill="none" stroke={lv.color} strokeWidth="3" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .4s"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:10,fontWeight:800,color:lv.color}}>{LEVELS.indexOf(lv)+1}</span>
              </div>
            </div>
          );})()}
        </div>
        <div style={{display:"flex",gap:5,marginLeft:"auto",alignItems:"center"}}>
          <button onClick={()=>setShowSearch(true)} style={{background:"rgba(255,255,255,.06)",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",padding:"6px 10px",fontSize:13}}>🔍</button>
          <button onClick={()=>setShowSummary(true)} style={{background:"rgba(255,255,255,.06)",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",padding:"6px 10px",fontSize:13}}>📊</button>
          <button onClick={()=>setShowColorEditor(true)} style={{background:"rgba(255,255,255,.06)",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",padding:"6px 10px",fontSize:13}}>🎨</button>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["tasks","📋 Tasks"],["timer","🍅 Timer"],["history","📜 History"],["add","+ Add"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{background:tab===k?"#6366F1":"rgba(255,255,255,.06)",color:tab===k?"#fff":"#aaa",border:"none",borderRadius:8,padding:"8px 12px",fontWeight:700,cursor:"pointer",fontSize:12}}>{l}{k==="timer"&&session.length>0?` (${session.length})`:""}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
        {tab==="tasks"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,padding:"14px 14px 0"}}>
            <div style={{flex:1,display:"flex",gap:0,minHeight:0}}>
              {BUCKETS.map(b=>(
                <div key={b.id} style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,margin:"0 5px",background:"#1a1a2a",borderRadius:10}}>
                  <BucketCol bucket={b}/>
                </div>
              ))}
            </div>
            {snoozedTasks.length>0&&(
              <div style={{margin:"10px 5px 0",background:"#1a1a2a",borderRadius:10,overflow:"hidden",flexShrink:0}}>
                <button onClick={()=>setShowSnoozed(s=>!s)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"none",border:"none",color:"#818CF8",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                  <span style={{fontSize:14}}>💤</span>
                  <span style={{fontWeight:700,fontSize:13,flex:1}}>SNOOZED ({snoozedTasks.length})</span>
                  <span style={{fontSize:12,color:"#555"}}>{showSnoozed?"▲ collapse":"▼ expand"}</span>
                </button>
                {showSnoozed&&(
                  <div style={{padding:"0 12px 12px",display:"flex",flexWrap:"wrap",gap:8}}>
                    {snoozedTasks.map(t=>{ const c=colorMap[t.color]||colors[0]; const sl=snoozeLabel(t.snoozedUntil); return(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:10,padding:"8px 12px",cursor:"pointer"}} onClick={()=>setOpenTask(t)}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:c.dot}}/>
                        <span style={{fontSize:12,color:"#1a1a2e",fontWeight:500}}>{t.text}</span>
                        <span style={{fontSize:10,color:"#818CF8",fontWeight:700}}>⏰ {sl}</span>
                        <button onClick={e=>{e.stopPropagation();unsnooze(t.id);}} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:12,padding:0}}>↩</button>
                      </div>
                    );})}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab==="timer"&&(
          <div style={{flex:1,display:"flex",gap:0,minHeight:0,padding:14}}>
            <div style={{width:230,display:"flex",flexDirection:"column",gap:10,marginRight:12,flexShrink:0}}>
              <div onDragOver={e=>e.preventDefault()} onDrop={onDropSession} style={{border:"2px dashed #6366F1",borderRadius:12,padding:12,background:"#1a1a2a",flex:1,minHeight:100}}>
                <div style={{fontSize:11,color:"#a5b4fc",fontWeight:700,marginBottom:8,letterSpacing:.5}}>🍅 SESSION QUEUE</div>
                {session.length===0&&<div style={{color:"#444",fontSize:12,textAlign:"center",paddingTop:12}}>Drag tasks here</div>}
                {session.map((id,i)=>{ const task=tasks.find(t=>t.id===id); if(!task) return null; const c=colorMap[task.color]||colors[0]; const isActive=i===pomoIdx; return(
                  <div key={id} onClick={()=>setPomoIdx(i)} style={{background:isActive?c.bg:"#252535",border:`1.5px solid ${isActive?c.border:"#333"}`,borderRadius:8,padding:"8px 10px",marginBottom:5,display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
                    <span style={{fontSize:11,color:"#a5b4fc",fontWeight:700,width:16}}>{i+1}</span>
                    <span style={{width:7,height:7,borderRadius:"50%",background:c.dot}}/>
                    <span style={{flex:1,fontSize:12,color:isActive?"#1a1a2e":"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.text}</span>
                    <button onClick={e=>{e.stopPropagation();removeFromSession(id);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:15,padding:0}}>×</button>
                  </div>
                );})}
              </div>
            </div>
            <div style={{width:210,background:"#1a1a2a",borderRadius:16,padding:"22px 16px",textAlign:"center",flexShrink:0,alignSelf:"flex-start"}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:2,color:pomoPhase==="work"?"#6366F1":"#10B981",marginBottom:4}}>{pomoPhase==="work"?"🍅 FOCUS":"☕ BREAK"}</div>
              <div style={{fontSize:58,fontWeight:800,color:"#fff",letterSpacing:-2,lineHeight:1}}>{fmt(pomoSecs)}</div>
              <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:14}}>
                <button onClick={()=>setPomoActive(a=>!a)} style={{background:pomoActive?"#EF4444":"#6366F1",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,cursor:"pointer",fontSize:14}}>{pomoActive?"⏸":"▶"}</button>
                <button onClick={()=>{setPomoSecs(25*60);setPomoActive(false);setPomoPhase("work");setPomoIdx(0);}} style={{background:"#252535",color:"#aaa",border:"none",borderRadius:10,padding:"9px 12px",fontWeight:600,cursor:"pointer"}}>↺</button>
              </div>
              {session.length>0&&<div style={{marginTop:10,fontSize:11,color:"#555"}}>Task {pomoIdx+1} of {session.length}</div>}
            </div>
            <div style={{flex:1,minWidth:0,marginLeft:12}}>
              <TimerTaskPanel taskId={session[pomoIdx]}/>
            </div>
          </div>
        )}

        {tab==="history"&&(
          <div style={{flex:1,overflowY:"auto",padding:20}}>
            <div style={{fontSize:13,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:16}}>COMPLETED THIS SESSION</div>
            {tasks.filter((t: Task)=>t.done&&t.completedAt!=null).sort((a,b)=>(b.completedAt??0)-(a.completedAt??0)).length===0&&<div style={{color:"#444",fontSize:13,textAlign:"center",marginTop:40}}>No completed tasks yet — go crush some! 💪</div>}
            {tasks.filter((t: Task)=>t.done&&t.completedAt!=null).sort((a,b)=>(b.completedAt??0)-(a.completedAt??0)).map(t=>{ const c=colorMap[t.color]||colors[0]; const time=new Date(t.completedAt!).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}); return(
                <div key={t.id} onClick={()=>setOpenTask(t as Task)} style={{display:"flex",alignItems:"center",gap:10,background:"#1a1a2a",border:"1px solid #252535",borderRadius:10,padding:"10px 14px",marginBottom:8,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#252535"} onMouseLeave={e=>e.currentTarget.style.background="#1a1a2a"}>
                <span style={{fontSize:16}}>✓</span>
                <span style={{width:8,height:8,borderRadius:"50%",background:c.dot}}/>
                <span style={{flex:1,fontSize:13,color:"#888",textDecoration:"line-through"}}>{t.text}</span>
                <span style={{fontSize:11,color:"#FBBF24",fontWeight:700}}>+{t.points||1}⭐</span>
                <span style={{fontSize:10,color:"#444"}}>{time}</span>
              </div>
            );})}
          </div>
        )}

        {tab==="add"&&(
          <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:24,overflow:"auto"}}>
            <div style={{background:"#1a1a2a",borderRadius:14,padding:24,width:"100%",maxWidth:520}}>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {[["quick","⌨️ Quick"],["gmail","📧 Gmail"],["sms","📱 SMS"],["voice","🎙️ Voice"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setAddPanel(k)} style={{flex:1,fontSize:12,padding:"7px 4px",borderRadius:8,border:addPanel===k?"2px solid #6366F1":"1px solid #333",background:addPanel===k?"#2a2a4a":"#252535",color:addPanel===k?"#a5b4fc":"#888",cursor:"pointer",fontWeight:addPanel===k?700:400}}>{l}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {[["urgent","🔥","#EF4444"],["tasks","📋","#6366F1"],["procrastinating","😬","#F59E0B"]].map(([k,l,col])=>(
                  <button key={k} onClick={()=>setNewBucket(k)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:newBucket===k?`2px solid ${col}`:"1px solid #333",background:newBucket===k?`${col}22`:"#252535",cursor:"pointer",fontSize:13,fontWeight:newBucket===k?700:400,color:newBucket===k?col:"#888"}}>{l}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
                {colors.map(c=><button key={c.id} onClick={()=>setNewColor(c.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,border:newColor===c.id?`2px solid ${c.border}`:"1px solid #333",background:newColor===c.id?c.bg:"#252535",cursor:"pointer",fontSize:11,fontWeight:newColor===c.id?700:400,color:newColor===c.id?"#1a1a2e":"#888"}}><span style={{width:7,height:7,borderRadius:"50%",background:c.dot,display:"inline-block"}}/>{c.label}</button>)}
                <button onClick={()=>setShowColorEditor(true)} style={{background:"rgba(255,255,255,.05)",border:"1px solid #333",borderRadius:20,color:"#555",cursor:"pointer",fontSize:11,padding:"4px 8px"}}>✏️ Edit</button>
              </div>
              {addPanel==="quick"&&<div>
                <textarea value={newText} onChange={e=>setNewText(e.target.value)} placeholder="What do you need to blitz through?" rows={3} style={{width:"100%",borderRadius:8,border:"1px solid #333",padding:12,fontSize:14,resize:"none",boxSizing:"border-box",background:"#252535",color:"#fff",marginBottom:8}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addTask(newText);}}}/>
                <div style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                    <label style={{fontSize:12,color:"#888"}}>📅</label>
                    <input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} style={{flex:1,background:"#252535",border:"1px solid #333",borderRadius:6,padding:"5px 8px",color:"#fff",fontSize:12}}/>
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                    <label style={{fontSize:12,color:"#888"}}>🔁</label>
                    <select value={newRecur} onChange={e=>setNewRecur(e.target.value)} style={{flex:1,background:"#252535",border:"1px solid #333",borderRadius:6,padding:"5px 8px",color:"#fff",fontSize:12,cursor:"pointer"}}>
                      {RECUR_OPTIONS.map((o,i)=><option key={o} value={o}>{RECUR_LABELS[i]}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={()=>addTask(newText)} style={{width:"100%",background:"#6366F1",color:"#fff",border:"none",borderRadius:8,padding:"12px 0",fontWeight:700,cursor:"pointer",fontSize:15}}>Add Task</button>
              </div>}
              {addPanel==="gmail"&&<div>
                <textarea value={gmailText} onChange={e=>setGmailText(e.target.value)} placeholder={"Subject: Review contract\nFrom: someone@..."} rows={5} style={{width:"100%",borderRadius:8,border:"1px solid #333",padding:12,fontSize:13,resize:"none",boxSizing:"border-box",background:"#252535",color:"#fff",marginBottom:8}}/>
                <button onClick={()=>{const lines=gmailText.split("\n").filter(l=>l.trim());const sub=lines.find(l=>l.toLowerCase().startsWith("subject:"));const t=sub?sub.replace(/subject:/i,"").trim():lines[0];if(t){addTask("Fw: "+t,"purple","urgent");setGmailText("");}}} style={{width:"100%",background:"#10B981",color:"#fff",border:"none",borderRadius:8,padding:"12px 0",fontWeight:700,cursor:"pointer"}}>📧 Import as Task</button>
              </div>}
              {addPanel==="sms"&&<div>
                <textarea value={smsText} onChange={e=>setSmsText(e.target.value)} placeholder="Paste or type SMS..." rows={3} style={{width:"100%",borderRadius:8,border:"1px solid #333",padding:12,fontSize:14,resize:"none",boxSizing:"border-box",background:"#252535",color:"#fff",marginBottom:8}}/>
                <button onClick={()=>{if(smsText.trim()){addTask(smsText,"green","urgent");setSmsText("");}}} style={{width:"100%",background:"#3B82F6",color:"#fff",border:"none",borderRadius:8,padding:"12px 0",fontWeight:700,cursor:"pointer"}}>📱 Add from SMS</button>
              </div>}
              {addPanel==="voice"&&<div style={{textAlign:"center",padding:"24px 0"}}>
                <button onClick={()=>{const w=window as unknown as {SpeechRecognition?: new()=>{lang:string;onstart:()=>void;onend:()=>void;onresult:(e:{results:{[i:number]:{[j:number]:{transcript:string}}}})=>void;start:()=>void};webkitSpeechRecognition?: new()=>{lang:string;onstart:()=>void;onend:()=>void;onresult:(e:{results:{[i:number]:{[j:number]:{transcript:string}}}})=>void;start:()=>void}};const SR=w.SpeechRecognition||w.webkitSpeechRecognition;if(!SR){alert("Voice not supported in this environment");return;}const r=new SR();r.lang="en-US";r.onstart=()=>setListening(true);r.onend=()=>setListening(false);r.onresult=(e: {results: {[i: number]: {[j: number]: {transcript: string}}}})=>addTask(e.results[0][0].transcript,newColor,newBucket);r.start();}} style={{width:90,height:90,borderRadius:"50%",background:listening?"#EF4444":"#6366F1",color:"#fff",border:"none",fontSize:36,cursor:"pointer",boxShadow:listening?"0 0 0 12px rgba(239,68,68,.2)":"none",transition:"all .2s"}}>🎙️</button>
                <div style={{marginTop:14,fontSize:13,color:listening?"#EF4444":"#888"}}>{listening?"Listening...":"Tap to speak"}</div>
              </div>}
            </div>
          </div>
        )}
      </div>

      {tab==="tasks"&&(
        <div onDragOver={e=>e.preventDefault()} onDrop={onDropSession} style={{background:"#1E1E2E",borderTop:"1px solid #2a2a40",padding:"8px 20px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flexShrink:0,minHeight:50}}>
          <span style={{fontSize:12,color:session.length?"#a5b4fc":"#444",fontWeight:700,flexShrink:0}}>🍅 {session.length===0?"Drop tasks here for Timer →":`Timer queue (${session.length})`}</span>
          {session.map(id=>{ const task=tasks.find(t=>t.id===id); if(!task) return null; const c=colorMap[task.color]||colors[0]; return(
            <div key={id} style={{display:"flex",alignItems:"center",gap:4,background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:20,padding:"3px 8px 3px 6px",fontSize:11,color:"#1a1a2e",maxWidth:160,overflow:"hidden"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:c.dot}}/>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.text}</span>
              <button onClick={()=>removeFromSession(id)} style={{background:"none",border:"none",color:"#999",cursor:"pointer",fontSize:13,padding:0,marginLeft:2}}>×</button>
            </div>
          );})}
          {session.length>0&&<button onClick={()=>setTab("timer")} style={{marginLeft:"auto",background:"#6366F1",color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>▶ Start Timer</button>}
        </div>
      )}
    </div>
  );
}
