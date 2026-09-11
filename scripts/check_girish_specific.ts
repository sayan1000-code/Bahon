const coordParam = "88.384210,22.610521;88.397194,22.585537;88.391563,22.583708;88.369433,22.585394;88.362602,22.585515;88.350770,22.580710;88.343445,22.584455";
fetch(`https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&continue_straight=true`)
  .then(r => r.json())
  .then(data => {
    const pts = data.routes[0].geometry.coordinates.map(([lng, lat]: any) => [lat, lng]);
    // Girish Park specific area: lng between 88.358 and 88.366
    const girishPts = pts.filter((p: any) => p[1] >= 88.358 && p[1] <= 88.366 && p[0] >= 22.582 && p[0] <= 22.588);
    console.log(`Girish specific points count: ${girishPts.length}`);
    for (let i = 0; i < girishPts.length; i++) {
      console.log(`  [${i}] ${girishPts[i][0].toFixed(6)}, ${girishPts[i][1].toFixed(6)}`);
    }
  });
