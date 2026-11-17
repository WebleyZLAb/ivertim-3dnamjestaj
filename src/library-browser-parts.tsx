import { useState, type ReactNode } from "react";
import { libraryChildren, libraryDisplayPath, libraryPicture } from "../lib/corpus-library-browser";

export function LibraryFolderTree({folders,selected,onSelect}: {folders:readonly string[];selected:string;onSelect(path:string):void}) {
  const [expanded,setExpanded] = useState<Readonly<Record<string,boolean>>>({});
  function branch(parent:string): ReactNode {
    return libraryChildren(folders,parent).map(path => {
      const children = libraryChildren(folders,path);
      const open = expanded[path] ?? selected.startsWith(path + "/");
      return <div key={path}><div className="library-tree-row" style={{paddingLeft:(path.split("/").length-1)*12}}>
        {children.length ? <button className="library-tree-toggle" aria-label={`${open ? "Skupi" : "Proširi"} folder ${path.split("/").at(-1)}`} aria-expanded={open} onClick={()=>setExpanded(current=>({...current,[path]:!open}))}>{open ? "▾" : "▸"}</button> : <span className="library-tree-spacer"/>}
        <button className={selected===path?"active":""} aria-current={selected===path?"page":undefined} title={path} onClick={()=>{onSelect(path);setExpanded(current=>({...current,[path]:true}));}}>▱ {path.split("/").at(-1)}</button>
      </div>{open ? branch(path) : null}</div>;
    });
  }
  return <nav className="library-folders" aria-label="Folderi biblioteke"><button className={!selected?"active":""} onClick={()=>onSelect("")}>⌂ Početni folder</button>{branch("")}</nav>;
}

export function LibraryElementCard({path,name,pictures,active,onSelect}: {path:string;name:string;pictures:ReadonlyMap<string,string>;active:boolean;onSelect():void}) {
  const picture = libraryPicture(path,pictures);
  const [failed,setFailed] = useState(false);
  return <button className={`library-element-card${active?" active":""}`} aria-pressed={active} title={libraryDisplayPath(path)} onClick={onSelect}>
    <span className="library-card-picture">{picture&&!failed ? <img src={"/local-corpus/"+picture.split("/").map(encodeURIComponent).join("/")} alt="" loading="lazy" onError={()=>setFailed(true)}/> : <span className="library-card-placeholder" aria-hidden="true">◇<small>3D pregled</small></span>}</span>
    <strong>{name.replace(/\.e3d$/i,"")}</strong>
  </button>;
}
