/** Corpus board rotation in renderer space (before the scene's X reflection).
 * The saved position is the board's corner, not its centre.
 */
export function corpusBoardRenderTransform(
 position: readonly [number,number,number], size: readonly [number,number,number],
 angles: readonly [number,number,number],
): { position: [number,number,number]; rotation: [number,number,number] } {
 const rotation: [number,number,number]=[-angles[0]*Math.PI/180,-angles[1]*Math.PI/180,angles[2]*Math.PI/180];
 let [x,y,z]=size.map(value=>value/2) as [number,number,number];
 // Three.js Euler XYZ: Rz is applied first, followed by Ry and Rx.
 const [rx,ry,rz]=rotation;
 [x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)];
 [x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];
 [y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];
 return {position:[position[0]+x,position[1]+y,-position[2]+z],rotation};
}
