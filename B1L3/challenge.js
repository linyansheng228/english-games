'use strict';
// Playable data from tools/previews/challenge-layouts.json. A classic script also works from file://.
window.catChallenge = {
  rooms: [
    {id: 'A', questions: [
      {"position":"in the box","cats":["lucy"]},
      {"position":"between the box and the chair","cats":["billy"]},
      {"position":"on the table","cats":["milo"]},
      {"position":"under the table","cats":["tommy"]},
      {"position":"in front of the TV","cats":["sammy","maggie"]},
      {"position":"next to the robot dog","cats":["puffy"]},
    ], placements: {
      lucy: {"image":"lucy.png","x":14.2,"y":57.5,"width":15,"layer":1},
      billy: {"image":"billy.png","x":26.4,"y":80,"width":18,"layer":6},
      milo: {"image":"milo.png","x":51.5,"y":49,"width":19.5,"layer":6},
      tommy: {"image":"tommy.png","x":59.4,"y":82.5,"width":19,"layer":3},
      sammy: {"image":"sammy.png","x":75.3,"y":44,"width":11.5,"layer":3},
      maggie: {"image":"maggie.png","x":81.5,"y":44.5,"width":12,"layer":4},
      puffy: {"image":"puffy.png","x":93.3,"y":72,"width":12,"layer":3},
    }},
    {id: 'B', questions: [
      {"position":"in the box","cats":["sammy"]},
      {"position":"between the box and the chair","cats":["tommy"]},
      {"position":"on the table","cats":["maggie"]},
      {"position":"under the table","cats":["milo"]},
      {"position":"in front of the TV","cats":["lucy","puffy"]},
      {"position":"next to the robot dog","cats":["billy"]},
    ], placements: {
      sammy: {"image":"sammy.png","x":14.8,"y":62.4,"width":12,"layer":1},
      tommy: {"image":"tommy-yarn-sit.png","x":26.5,"y":81,"width":9.5,"layer":6},
      maggie: {"image":"maggie.png","x":51.5,"y":49,"width":12,"layer":6},
      milo: {"image":"milo.png","x":59.5,"y":82,"width":14,"layer":3},
      lucy: {"image":"lucy.png","x":73.6,"y":45.5,"width":8,"layer":3},
      puffy: {"image":"puffy.png","x":81.8,"y":48.8,"width":10.5,"layer":4},
      billy: {"image":"billy.png","x":91.8,"y":68.5,"width":15.2,"layer":3},
    }},
    {id: 'C', questions: [
      {"position":"in the box","cats":["maggie"]},
      {"position":"between the box and the chair","cats":["sammy"]},
      {"position":"on the table","cats":["tommy"]},
      {"position":"under the table","cats":["lucy"]},
      {"position":"in front of the TV","cats":["billy"]},
      {"position":"in front of the robot dog","cats":["milo","puffy"]},
    ], placements: {
      maggie: {"image":"maggie-box-peek.png","x":14,"y":56.5,"width":10,"layer":1},
      sammy: {"image":"sammy.png","x":26.5,"y":81,"width":10.5,"layer":6},
      tommy: {"image":"tommy.png","x":53,"y":49,"width":14,"layer":6},
      lucy: {"image":"lucy.png","x":59.5,"y":82,"width":15,"layer":3},
      billy: {"image":"billy-crouch.png","x":79.5,"y":45.2,"width":16.5,"layer":3},
      milo: {"image":"milo.png","x":77,"y":98,"width":18.5,"layer":8},
      puffy: {"image":"puffy.png","x":92.4,"y":95.2,"width":12,"layer":8},
    }},
  ],
  trim: {
    'billy-crouch.png': [79, 113, 1627, 699, 1774, 887],
    'billy.png': [4, 4, 288, 349, 296, 357],
    'lucy.png': [4, 4, 341, 223, 349, 231],
    'maggie-box-peek.png': [353, 12, 809, 943, 1373, 1145],
    'maggie.png': [4, 4, 330, 294, 338, 302],
    'milo.png': [4, 4, 435, 345, 443, 353],
    'puffy.png': [4, 4, 382, 274, 390, 282],
    'sammy.png': [4, 4, 295, 336, 303, 344],
    'tommy-yarn-sit.png': [218, 19, 837, 1101, 1278, 1230],
    'tommy.png': [4, 4, 444, 268, 452, 276],
  },
  // Right edge of the extra table mask for each row from y=370 to 461.
  tableEdge: [1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1140, 1141, 1142, 1143, 1143, 1144, 1145, 1146, 1147, 1147, 1148, 1149, 1150, 1150, 1151, 1152, 1153, 1153, 1154, 1155, 1155, 1156, 1157, 1158, 1158, 1159, 1160, 1160, 1161, 1162, 1163, 1163, 1164, 1165, 1166, 1166, 1167, 1168, 1168, 1169, 1170, 1170, 1171, 1172, 1172, 1173, 1174, 1174, 1175, 1176, 1176, 1177, 1178, 1178, 1179, 1180, 1180, 1181, 1181, 1182, 1182, 1183, 1184, 1185, 1185, 1186, 1187, 1187, 1188, 1188]
};

// Each profile is a compatible set of seats. Seats from different profiles
// conflict, even where their coordinates describe the same piece of furniture.
// Alternate occupants use the seat's geometry and their full original sprite.
window.catChallenge.build = function build(basicQuestions) {
  const tv = [[.72,.39],[.78,.385],[.91,.40],[.94,.48],[.88,.52],[.72,.53]];
  const dogFront = [[.70,.79],[.96,.79],[.995,.91],[.995,1],[.68,1]];
  const alternatives = {
    B: {maggie:'milo', milo:'maggie'},
    C: {tommy:'lucy', lucy:'tommy'},
  };
  const profiles = this.rooms.filter(({id})=>alternatives[id]).map(room=>{
    const seats = room.questions.flatMap(({position,cats},group)=>cats.map(original=>{
      const target = basicQuestions[group];
      const zones = group===4 ? [tv] : position==='in front of the robot dog' ? [dogFront] : target.zones||[target.zone];
      const anchor = room.placements[original];
      const options = [{cat:original, image:anchor.image}];
      const alternative = alternatives[room.id][original];
      if(alternative)options.push({cat:alternative,image:alternative+'.png'});
      return {id:room.id+'-'+original, group, position, zones, anchor, options,
        tableMask:room.id==='B'&&original==='lucy'};
    }));
    return {id:room.id,seats};
  });
  const configurations = [];
  for(const {id,seats} of profiles){
    const used = new Set();
    const placements = {};
    const groups = [];
    function assign(index){
      if(index===seats.length){
        configurations.push({id,key:seats.map(s=>groups[s.group].join('+')).join('|'),
          placements:{...placements},
          questions:groups.map((cats,group)=>{
            const {position,zones}=seats.find(s=>s.group===group);
            return {cats:[...cats],position,zones};
          })});
        return;
      }
      const seat=seats[index];
      const group=groups[seat.group]??(groups[seat.group]=[]);
      for(const {cat,image} of seat.options){
        if(used.has(cat))continue;
        used.add(cat);group.push(cat);
        placements[cat]={...seat.anchor,image,seat:seat.id,tableMask:seat.tableMask};
        assign(index+1);
        delete placements[cat];group.pop();used.delete(cat);
      }
    }
    assign(0);
  }
  return {profiles,configurations};
};
