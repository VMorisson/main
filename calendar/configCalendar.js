const nameToRowId = {
    "Romain": 1,
    "Lucas": 2,
    "Rodrigue": 3,
    "LAUREA": 9,
    "PRESTA": 11
  };
  
  const rowIdToName = Object.fromEntries(
    Object.entries(nameToRowId).map(([name, id]) => [id, name])
  );
  
  export { nameToRowId, rowIdToName };


  