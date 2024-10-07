import React from 'react';

const PlanetInfo = ({ planet }) => {
  if (!planet) {
    return <div className="planet-info">Haz clic en un planeta para ver la información</div>;
  }

  return (
<div className="planet-info">
  <h2>{planet.name}</h2> {/* Aquí se muestra el nombre */}
  <p><strong>Diámetro:</strong> {planet.realDiameter} km</p>
  <p><strong>Distancia al Sol:</strong> {planet.realDistance} millones de km</p>
  {planet.composition && <p><strong>Composición:</strong> {planet.composition}</p>}
</div>


  );
};

export default PlanetInfo;
