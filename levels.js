// Course revision 3: preserve room IDs; design notes are part of the reviewable data.
export const COURSE_VERSION=3;
export const CHAPTERS=Object.freeze([
  {id:1,name:"El equilibrio",subtitle:"Aprendé a leer la gravedad",range:"01 — 05",color:"#ff916e"},
  {id:2,name:"La materia",subtitle:"Cada superficie responde distinto",range:"06 — 10",color:"#74d6db"},
  {id:3,name:"El ritmo",subtitle:"Observá, conectá y resolvé",range:"11 — 14",color:"#b5a1ed"},
  {id:4,name:"La altura",subtitle:"Pensá en tres dimensiones",range:"15 — 22",color:"#f0c477"}
]);
const rooms=[
  {
    "id": 1,
    "obstacles": [],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Placa verde",
    "objective": "Llevá el cubo rojo a la placa verde.",
    "hint": "Incliná suavemente hacia la placa verde.",
    "start": [
      -1.55,
      1.35
    ],
    "target": {
      "type": 1,
      "pos": [
        1.3,
        -1.1
      ]
    },
    "chapter": 1,
    "lesson": "Acelerar no es frenar",
    "briefing": "Tu primera sala tiene espacio para experimentar. Un movimiento pequeño es suficiente.",
    "mechanics": [
      "Control"
    ],
    "revision": "Recorrido inicial más corto, sin obstáculos: primero se aprende el control, después la precisión.",
    "hints": [
      "Incliná suavemente hacia la placa verde.",
      "Soltar el control no frena de golpe: el cubo conserva inercia.",
      "Aplicá un poco de inclinación contraria antes de llegar."
    ]
  },
  {
    "id": 2,
    "obstacles": [
      {
        "x": 0,
        "z": 0.18,
        "w": 0.44,
        "d": 1.85
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Rebote controlado",
    "objective": "Rodeá el muro y llegá a la placa azul.",
    "hint": "Mirá los dos extremos del muro central.",
    "start": [
      1.85,
      1.55
    ],
    "target": {
      "type": 2,
      "pos": [
        -1.65,
        -1.35
      ]
    },
    "chapter": 1,
    "lesson": "Elegí el lado del muro",
    "briefing": "Hay más de un camino. Rodeá el muro y usá la pared solo si necesitás corregir.",
    "mechanics": [
      "Colisiones"
    ],
    "revision": "Muro más corto y fino; giros más amplios y llegada menos pegada al borde.",
    "hints": [
      "Mirá los dos extremos del muro central.",
      "El paso del fondo deja lugar para corregir la trayectoria.",
      "Subí por la derecha, cruzá detrás del muro y frená hacia la placa."
    ]
  },
  {
    "id": 3,
    "obstacles": [
      {
        "x": -0.18,
        "z": -0.2,
        "w": 2.05,
        "d": 0.38
      }
    ],
    "zones": [
      {
        "type": 2,
        "x": 1.25,
        "z": 1.15,
        "r": 0.68
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Estabilidad",
    "objective": "Dejá el cubo quieto dentro del aro amarillo.",
    "hint": "El aro necesita que te quedes casi quieto.",
    "start": [
      -1.9,
      -1.55
    ],
    "target": {
      "type": 3,
      "pos": [
        1.25,
        1.15
      ]
    },
    "chapter": 1,
    "lesson": "Detenete, no solo llegues",
    "briefing": "El aro cuenta la estabilidad. El suelo violeta de llegada te ayuda a quitar velocidad.",
    "mechanics": [
      "Estabilidad",
      "Freno"
    ],
    "revision": "Aro con zona de frenado propia y muro acortado: feedback legible y menor castigo al aprender.",
    "hints": [
      "El aro necesita que te quedes casi quieto.",
      "La zona violeta frena más que la alfombra.",
      "Rodeá el muro por la izquierda y frená dentro del aro durante medio segundo."
    ]
  },
  {
    "id": 4,
    "obstacles": [
      {
        "x": -1.1,
        "z": -0.22,
        "w": 0.34,
        "d": 1.8
      },
      {
        "x": 1.1,
        "z": -0.22,
        "w": 0.34,
        "d": 1.8
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Portal del fondo",
    "objective": "Entrá al portal central del fondo.",
    "hint": "Avanzá por el centro entre las dos guías.",
    "start": [
      0,
      1.45
    ],
    "target": {
      "type": 4,
      "pos": [
        0,
        -2.3
      ]
    },
    "chapter": 1,
    "lesson": "Alineá la entrada",
    "briefing": "El portal se activa en la marca del piso. No hace falta golpear la pared del fondo.",
    "mechanics": [
      "Portal"
    ],
    "revision": "Corredor central más ancho, arranque más cercano y marca del portal adelantada.",
    "hints": [
      "Avanzá por el centro entre las dos guías.",
      "Buscá la marca luminosa del piso, no la pared.",
      "Alineá el cubo con el portal y mantené un impulso suave hacia el fondo."
    ]
  },
  {
    "id": 5,
    "obstacles": [
      {
        "x": 0,
        "z": 0.4,
        "w": 0.46,
        "d": 1.45
      },
      {
        "x": 0,
        "z": -1.2,
        "w": 1.65,
        "d": 0.34
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Secuencia física",
    "objective": "Activá verde, azul y portal en orden.",
    "hint": "Seguí el orden: verde, azul y portal.",
    "start": [
      -1.85,
      1.8
    ],
    "sequence": [
      {
        "type": 1,
        "pos": [
          1.62,
          1.28
        ]
      },
      {
        "type": 2,
        "pos": [
          -1.72,
          -1.22
        ]
      },
      {
        "type": 4,
        "pos": [
          0,
          -2.42
        ]
      }
    ],
    "chapter": 1,
    "lesson": "Un objetivo a la vez",
    "briefing": "Las tres señales forman un recorrido. Solo se activa la que marca el indicador de pasos.",
    "mechanics": [
      "Secuencia",
      "Portal"
    ],
    "revision": "Pasillos ampliados entre barreras para que la primera secuencia enseñe orientación y no huecos mínimos.",
    "hints": [
      "Seguí el orden: verde, azul y portal.",
      "Las señales apagadas muestran lo que viene después.",
      "Bajá por delante de la primera barrera, rodeá la segunda por un lado y terminá en el fondo."
    ]
  },
  {
    "id": 6,
    "obstacles": [
      {
        "x": 0,
        "z": -0.05,
        "w": 0.42,
        "d": 1.2,
        "move": {
          "axis": "z",
          "amp": 0.82,
          "speed": 0.75,
          "phase": 0
        }
      },
      {
        "x": 0,
        "z": -2.55,
        "w": 0.42,
        "d": 0.8
      },
      {
        "x": 0,
        "z": 2.55,
        "w": 0.42,
        "d": 0.8
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Compuerta móvil",
    "objective": "Cruzá cuando la barrera deje el paso libre.",
    "hint": "No persigas la compuerta: esperá el hueco.",
    "start": [
      -2.2,
      1.85
    ],
    "target": {
      "type": 1,
      "pos": [
        2.05,
        -1.75
      ]
    },
    "chapter": 2,
    "lesson": "Observá antes de cruzar",
    "briefing": "La compuerta tiene un ritmo. Esperá del lado seguro y cruzá cuando aparezca un hueco.",
    "mechanics": [
      "Compuerta"
    ],
    "revision": "Movimiento más lento y dos guías laterales que hacen legible la ventana de paso.",
    "hints": [
      "No persigas la compuerta: esperá el hueco.",
      "Acercate sin velocidad mientras la barrera pasa.",
      "Cuando suba o baje, cruzá por el extremo opuesto con un impulso breve."
    ]
  },
  {
    "id": 7,
    "obstacles": [
      {
        "x": 0,
        "z": -1.05,
        "w": 1.65,
        "d": 0.32
      }
    ],
    "zones": [
      {
        "type": 1,
        "x": -0.05,
        "z": 0.45,
        "r": 1.1
      },
      {
        "type": 2,
        "x": 1.75,
        "z": -1.6,
        "r": 0.5
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Hielo",
    "objective": "Atravesá el hielo sin perder el control.",
    "hint": "En el hielo el cubo tarda más en detenerse.",
    "start": [
      -2.05,
      1.7
    ],
    "target": {
      "type": 2,
      "pos": [
        1.95,
        -1.72
      ]
    },
    "chapter": 2,
    "lesson": "Frená antes del hielo",
    "briefing": "La zona celeste conserva el impulso. La pequeña zona violeta de salida permite recuperar control.",
    "mechanics": [
      "Hielo",
      "Freno"
    ],
    "revision": "Hielo ligeramente menor, obstáculo superior acortado y espacio de frenado en la llegada.",
    "hints": [
      "En el hielo el cubo tarda más en detenerse.",
      "Empezá a corregir antes de salir de la zona celeste.",
      "Salí del hielo por la derecha del muro y usá la zona violeta junto a la placa."
    ]
  },
  {
    "id": 8,
    "obstacles": [],
    "zones": [
      {
        "type": 2,
        "x": 0.55,
        "z": 0.45,
        "r": 1.15
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Freno viscoso",
    "objective": "Usá la zona violeta para llegar despacio al aro.",
    "hint": "La zona violeta reduce la velocidad.",
    "start": [
      -2.1,
      -1.75
    ],
    "target": {
      "type": 3,
      "pos": [
        1.35,
        1.25
      ]
    },
    "chapter": 2,
    "lesson": "Dejá trabajar a la superficie",
    "briefing": "Entrá al violeta con un poco de impulso y dejá que te ayude a estabilizar la llegada.",
    "mechanics": [
      "Freno",
      "Estabilidad"
    ],
    "revision": "Zona viscosa recolocada y ampliada para conectar de verdad el trayecto con el aro.",
    "hints": [
      "La zona violeta reduce la velocidad.",
      "No hace falta compensar con movimientos bruscos.",
      "Pasá por el centro violeta y soltá suavemente el impulso al acercarte al aro."
    ]
  },
  {
    "id": 9,
    "obstacles": [
      {
        "x": 0,
        "z": 0,
        "w": 0.3,
        "d": 0.95
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [
      {
        "x": -0.7,
        "z": 0.15,
        "r": 0.34,
        "strength": 3.4
      },
      {
        "x": 1,
        "z": -0.7,
        "r": 0.34,
        "strength": 3.4
      }
    ],
    "name": "Bumpers",
    "objective": "Usá los postes rojos para cambiar de dirección.",
    "hint": "Un bumper impulsa hacia afuera desde el punto de contacto.",
    "start": [
      -2.2,
      1.85
    ],
    "target": {
      "type": 1,
      "pos": [
        2.05,
        -1.8
      ]
    },
    "chapter": 2,
    "lesson": "Un rebote, una corrección",
    "briefing": "Los postes devuelven energía. Un contacto suave permite aprender hacia dónde sale el cubo.",
    "mechanics": [
      "Bumper",
      "Colisiones"
    ],
    "revision": "Bumpers menos violentos y obstáculo central más corto, con área de recuperación tras el rebote.",
    "hints": [
      "Un bumper impulsa hacia afuera desde el punto de contacto.",
      "Frená después del rebote, no antes del impacto.",
      "Probá el primer poste con poca velocidad y rodeá el muro por el fondo."
    ]
  },
  {
    "id": 10,
    "obstacles": [
      {
        "x": 0.8,
        "z": 0.9,
        "w": 0.38,
        "d": 1.5
      }
    ],
    "zones": [
      {
        "type": 3,
        "x": -0.25,
        "z": -0.45,
        "r": 0.82,
        "dx": 1,
        "dz": -0.4
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Cinta de impulso",
    "objective": "Usá la franja naranja como acelerador.",
    "hint": "La cinta empuja aunque no estés inclinando.",
    "start": [
      -2.2,
      0.9
    ],
    "target": {
      "type": 2,
      "pos": [
        2.05,
        -1.65
      ]
    },
    "chapter": 2,
    "lesson": "Leé la dirección del impulso",
    "briefing": "Las flechas naranjas anticipan hacia dónde empuja la cinta. Usala sin pelear contra ella.",
    "mechanics": [
      "Impulso"
    ],
    "revision": "Cinta más contenida y mejor orientada hacia la salida; barrera lateral acortada.",
    "hints": [
      "La cinta empuja aunque no estés inclinando.",
      "Su dirección está dibujada en el piso.",
      "Entrá desde la izquierda y salí por encima de la barrera hacia la placa azul."
    ]
  },
  {
    "id": 11,
    "obstacles": [
      {
        "x": -0.65,
        "z": 0.25,
        "w": 0.42,
        "d": 1.6,
        "move": {
          "axis": "z",
          "amp": 0.62,
          "speed": 0.85,
          "phase": 0.2
        }
      },
      {
        "x": 0.92,
        "z": -0.7,
        "w": 1.35,
        "d": 0.32,
        "move": {
          "axis": "x",
          "amp": 0.62,
          "speed": 0.68,
          "phase": 1.8
        }
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [],
    "name": "Laberinto vivo",
    "objective": "Encontrá el paso entre dos compuertas.",
    "hint": "No intentes cruzar las dos barreras de una sola vez.",
    "start": [
      -2.25,
      1.95
    ],
    "target": {
      "type": 1,
      "pos": [
        2.1,
        -1.85
      ]
    },
    "chapter": 3,
    "lesson": "Separá las dos decisiones",
    "briefing": "Resolvés una compuerta por vez. El descanso entre ambas sirve para frenar y observar.",
    "mechanics": [
      "Compuertas"
    ],
    "revision": "Compuertas más lentas, menor amplitud y segunda barrera más corta para evitar pasos impredecibles.",
    "hints": [
      "No intentes cruzar las dos barreras de una sola vez.",
      "Buscá un lugar quieto después de la primera.",
      "El corredor del fondo permite reagruparte antes de apuntar a la placa."
    ]
  },
  {
    "id": 12,
    "obstacles": [
      {
        "x": 1.05,
        "z": 0.05,
        "w": 0.34,
        "d": 1.5
      }
    ],
    "zones": [
      {
        "type": 1,
        "x": -0.7,
        "z": 0.25,
        "r": 1
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [
      {
        "x": -0.6,
        "z": -0.75,
        "r": 0.36,
        "strength": 3.45
      }
    ],
    "name": "Hielo + bumper",
    "objective": "Combiná patinaje y rebote para llegar al portal.",
    "hint": "El hielo y el bumper cambian cosas distintas: fricción y dirección.",
    "start": [
      -2.1,
      1.8
    ],
    "target": {
      "type": 4,
      "pos": [
        0,
        -2.42
      ]
    },
    "chapter": 3,
    "lesson": "Convertí el deslizamiento en giro",
    "briefing": "El hielo conserva velocidad y el poste puede redirigirla. Hay espacio para corregir después.",
    "mechanics": [
      "Hielo",
      "Bumper",
      "Portal"
    ],
    "revision": "Bumper recolocado, impulso moderado y salida libre; la combinación deja de castigar con un rebote extremo.",
    "hints": [
      "El hielo y el bumper cambian cosas distintas: fricción y dirección.",
      "El lado del poste que tocás determina la salida.",
      "Probá tocar el poste desde el lado del fondo para salir hacia el portal."
    ]
  },
  {
    "id": 13,
    "obstacles": [
      {
        "x": 0,
        "z": 0.15,
        "w": 0.4,
        "d": 1.6
      }
    ],
    "zones": [
      {
        "type": 2,
        "x": 1.45,
        "z": 1.35,
        "r": 0.7
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [
      {
        "x": -0.75,
        "z": -0.45,
        "r": 0.34,
        "strength": 3.5
      }
    ],
    "name": "Triple secuencia",
    "objective": "Activá aro, placa azul y portal en orden.",
    "hint": "Empezá por el aro, no por la placa azul.",
    "start": [
      -1.8,
      -1.8
    ],
    "sequence": [
      {
        "type": 3,
        "pos": [
          1.55,
          1.45
        ]
      },
      {
        "type": 2,
        "pos": [
          -1.85,
          1.45
        ]
      },
      {
        "type": 4,
        "pos": [
          0,
          -2.42
        ]
      }
    ],
    "chapter": 3,
    "lesson": "Precisión primero, velocidad después",
    "briefing": "La primera parada exige estabilidad. Una vez activada, podés acelerar hacia los otros objetivos.",
    "mechanics": [
      "Secuencia",
      "Estabilidad"
    ],
    "revision": "Freno centrado en el primer objetivo, pilar más corto y bumper moderado para la transición.",
    "hints": [
      "Empezá por el aro, no por la placa azul.",
      "El freno violeta queda debajo del aro.",
      "Rodeá el pilar por delante, estabilizá, cruzá a la placa azul y seguí al portal."
    ]
  },
  {
    "id": 14,
    "obstacles": [
      {
        "x": 0,
        "z": 0.75,
        "w": 0.4,
        "d": 1.5,
        "move": {
          "axis": "x",
          "amp": 0.7,
          "speed": 0.78,
          "phase": 0.2
        }
      },
      {
        "x": 0.45,
        "z": -0.85,
        "w": 1.5,
        "d": 0.32,
        "move": {
          "axis": "z",
          "amp": 0.4,
          "speed": 0.7,
          "phase": 1.7
        }
      }
    ],
    "zones": [
      {
        "type": 1,
        "x": -0.9,
        "z": 0.8,
        "r": 0.85
      },
      {
        "type": 2,
        "x": 1.4,
        "z": -1.5,
        "r": 0.65
      },
      {
        "type": 3,
        "x": -0.45,
        "z": -1.3,
        "r": 0.65,
        "dx": 1,
        "dz": -0.35
      }
    ],
    "ramps": [],
    "platforms": [],
    "jumpPads": [],
    "bumpers": [
      {
        "x": 1.25,
        "z": 0.75,
        "r": 0.32,
        "strength": 3.8
      },
      {
        "x": -1.35,
        "z": -0.42,
        "r": 0.32,
        "strength": 3.8
      }
    ],
    "name": "Final dinámico",
    "objective": "Combiná hielo, freno, impulso y compuertas.",
    "hint": "El orden importa más que la velocidad.",
    "start": [
      -2.25,
      2.05
    ],
    "sequence": [
      {
        "type": 1,
        "pos": [
          2.05,
          1.52
        ]
      },
      {
        "type": 2,
        "pos": [
          -2.02,
          -1.38
        ]
      },
      {
        "type": 3,
        "pos": [
          1.55,
          -1.45
        ]
      },
      {
        "type": 4,
        "pos": [
          0,
          -2.42
        ]
      }
    ],
    "chapter": 3,
    "lesson": "Combiná sin apurarte",
    "briefing": "Es el cierre de las salas planas. Observá cada paso y elegí dónde ganar o perder velocidad.",
    "mechanics": [
      "Secuencia",
      "Hielo",
      "Impulso",
      "Compuertas"
    ],
    "revision": "Ritmos suavizados, freno junto al aro y zonas más pequeñas: menos solapamiento y más lectura del recorrido.",
    "hints": [
      "El orden importa más que la velocidad.",
      "Reservá el freno violeta para la parada amarilla.",
      "Verde abajo a la derecha; azul a la izquierda; aro a la derecha del fondo; después, portal."
    ]
  },
  {
    "id": 15,
    "obstacles": [
      {
        "x": -0.2,
        "z": -1.65,
        "w": 2,
        "d": 0.34
      }
    ],
    "zones": [],
    "ramps": [
      {
        "x": -0.3,
        "z": -0.82,
        "w": 2.1,
        "d": 1.35,
        "h": 0.62,
        "dx": 1,
        "dz": 0
      }
    ],
    "platforms": [
      {
        "x": 1.45,
        "z": -0.82,
        "w": 1.4,
        "d": 1.4,
        "h": 0.62
      }
    ],
    "jumpPads": [],
    "bumpers": [],
    "name": "Rampa de ascenso",
    "objective": "Subí a la plataforma y activá la placa verde.",
    "hint": "Buscá el extremo bajo de la rampa, a la izquierda.",
    "start": [
      -2.2,
      1.95
    ],
    "target": {
      "type": 1,
      "pos": [
        1.35,
        -0.82
      ],
      "y": 0.62
    },
    "chapter": 4,
    "lesson": "Entrá por el extremo bajo",
    "briefing": "Ahora la altura importa. La rampa une el piso con la plataforma: sus lados no son entradas.",
    "mechanics": [
      "Rampa",
      "Altura"
    ],
    "revision": "Rampa y descanso ensanchados transversalmente sin romper la continuidad de altura.",
    "hints": [
      "Buscá el extremo bajo de la rampa, a la izquierda.",
      "Mantené el cubo centrado mientras sube.",
      "Llegá a la rampa desde la izquierda y avanzá a la derecha; frená sobre la plataforma."
    ]
  },
  {
    "id": 16,
    "obstacles": [
      {
        "x": 0.08,
        "z": -0.05,
        "w": 2.5,
        "d": 0.34,
        "h": 0.34
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [
      {
        "x": -1,
        "z": 0.75,
        "r": 0.55,
        "power": 3.25,
        "dx": 2.5,
        "dz": -2.65
      }
    ],
    "bumpers": [],
    "name": "Primer salto",
    "objective": "Saltá el muro bajo con el pad celeste.",
    "hint": "Tocar el pad celeste activa el salto.",
    "start": [
      -2.1,
      1.55
    ],
    "target": {
      "type": 2,
      "pos": [
        1.6,
        -1.4
      ]
    },
    "chapter": 4,
    "lesson": "El salto empieza en el pad",
    "briefing": "El círculo celeste salta automáticamente. El muro es bajo y la llegada deja espacio de corrección.",
    "mechanics": [
      "Salto"
    ],
    "revision": "Pad más grande, lanzamiento reajustado y muro realmente bajo; llegada acercada para el primer salto.",
    "hints": [
      "Tocar el pad celeste activa el salto.",
      "En el aire la inclinación corrige menos que en el piso.",
      "Entrá al pad desde abajo a la izquierda y seguí apuntando hacia la placa azul."
    ]
  },
  {
    "id": 17,
    "obstacles": [
      {
        "x": 0.9,
        "z": -0.35,
        "w": 0.34,
        "d": 1.5
      }
    ],
    "zones": [],
    "ramps": [
      {
        "x": -0.965,
        "z": -0.95,
        "w": 2.05,
        "d": 1.3,
        "h": 0.72,
        "dx": -1,
        "dz": 0
      }
    ],
    "platforms": [
      {
        "x": -2.45,
        "z": -0.95,
        "w": 0.92,
        "d": 1.8,
        "h": 0.72
      }
    ],
    "jumpPads": [],
    "bumpers": [],
    "name": "Plataforma lateral",
    "objective": "Subí a la repisa izquierda y estabilizá el cubo.",
    "hint": "La rampa baja está a la derecha de la repisa.",
    "start": [
      2.05,
      1.85
    ],
    "target": {
      "type": 3,
      "pos": [
        -2.35,
        -0.95
      ],
      "y": 0.72
    },
    "chapter": 4,
    "lesson": "Ganale altura a la pared",
    "briefing": "La repisa se alcanza por la rampa derecha. Una vez arriba, frená antes de la pared.",
    "mechanics": [
      "Rampa",
      "Estabilidad"
    ],
    "revision": "Rampa y repisa más anchas; obstáculo separado de la entrada para que el acceso no parezca bloqueado.",
    "hints": [
      "La rampa baja está a la derecha de la repisa.",
      "Subí hacia la izquierda con velocidad moderada.",
      "Rodeá la barrera por el fondo, entrá al extremo derecho de la rampa y frená en el aro."
    ]
  },
  {
    "id": 18,
    "obstacles": [
      {
        "x": -1.1,
        "z": 0.2,
        "w": 0.4,
        "d": 1.6
      }
    ],
    "zones": [],
    "ramps": [
      {
        "x": 0.2,
        "z": 0.375,
        "w": 1.25,
        "d": 2.15,
        "h": 0.56,
        "dx": 0,
        "dz": -1
      }
    ],
    "platforms": [
      {
        "x": 1.65,
        "z": -1.25,
        "w": 1.3,
        "d": 1.3,
        "h": 0.56,
        "move": {
          "axis": "x",
          "amp": 0.45,
          "speed": 0.55,
          "phase": 0.4
        }
      },
      {
        "x": 0.2,
        "z": -1.25,
        "w": 1.6,
        "d": 1.3,
        "h": 0.56
      }
    ],
    "jumpPads": [],
    "bumpers": [],
    "name": "Plataforma móvil",
    "objective": "Subí a la plataforma móvil y activá su placa.",
    "hint": "Primero subí al descanso fijo por la rampa.",
    "start": [
      -2.05,
      1.75
    ],
    "target": {
      "type": 1,
      "pos": [
        1.65,
        -1.25
      ],
      "y": 0.56,
      "platform": 0
    },
    "chapter": 4,
    "lesson": "Esperá el encuentro",
    "briefing": "La plataforma se acerca al descanso fijo. Cuando estás encima, te transporta con ella.",
    "mechanics": [
      "Plataforma móvil"
    ],
    "revision": "Movimiento más lento, plataforma móvil mayor y descanso ampliado para una transferencia más tolerante.",
    "hints": [
      "Primero subí al descanso fijo por la rampa.",
      "Esperá a que la plataforma móvil se acerque.",
      "Cruzá al acercarse y corregí despacio: la placa se mueve con la plataforma."
    ]
  },
  {
    "id": 19,
    "obstacles": [
      {
        "x": 0,
        "z": 0.35,
        "w": 2,
        "d": 0.24,
        "h": 0.28
      },
      {
        "x": 0.25,
        "z": -1.1,
        "w": 2,
        "d": 0.24,
        "h": 0.28
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [],
    "jumpPads": [
      {
        "x": -1.2,
        "z": 1.25,
        "r": 0.52,
        "power": 3.7,
        "dx": 2.45,
        "dz": -3.3
      },
      {
        "x": -0.1,
        "z": -0.5,
        "r": 0.52,
        "power": 3.55,
        "dx": 2.8,
        "dz": -2.6
      }
    ],
    "bumpers": [],
    "name": "Doble salto",
    "objective": "Encadená dos saltos para llegar a la placa azul.",
    "hint": "Hay que tocar el segundo pad después del primer salto.",
    "start": [
      -2.15,
      2.05
    ],
    "target": {
      "type": 2,
      "pos": [
        1.6,
        -1.85
      ]
    },
    "chapter": 4,
    "lesson": "Aterrizá para volver a saltar",
    "briefing": "El segundo salto se activa al tocar el siguiente pad. Alineá la caída, no solo el primer vuelo.",
    "mechanics": [
      "Doble salto"
    ],
    "revision": "Muros rebajados, pads ampliados y lanzamiento recolocado para enlazar aterrizajes verificables.",
    "hints": [
      "Hay que tocar el segundo pad después del primer salto.",
      "No frenes por completo encima del primer muro.",
      "Apuntá al segundo círculo celeste durante el vuelo; después corregí hacia la placa azul."
    ]
  },
  {
    "id": 20,
    "obstacles": [
      {
        "x": 1.65,
        "z": 0.35,
        "w": 0.38,
        "d": 1.4
      }
    ],
    "zones": [],
    "ramps": [
      {
        "x": -1.5,
        "z": 1.1,
        "w": 1.15,
        "d": 1.4,
        "h": 0.32,
        "dx": 0,
        "dz": -1
      },
      {
        "x": -0.5,
        "z": 0,
        "w": 1,
        "d": 1,
        "base": 0.32,
        "h": 0.55,
        "dx": 1,
        "dz": 0
      },
      {
        "x": 0.45,
        "z": -1.1,
        "w": 0.95,
        "d": 1.4,
        "base": 0.55,
        "h": 0.8,
        "dx": 0,
        "dz": -1
      }
    ],
    "platforms": [
      {
        "x": -1.5,
        "z": 0,
        "w": 1.15,
        "d": 1,
        "h": 0.32
      },
      {
        "x": 0.5,
        "z": 0,
        "w": 1.15,
        "d": 1,
        "h": 0.55
      },
      {
        "x": 0,
        "z": -2.35,
        "w": 1.55,
        "d": 1.2,
        "h": 0.8
      }
    ],
    "jumpPads": [],
    "bumpers": [],
    "name": "Escalera física",
    "objective": "Subí por los tres tramos hasta el portal elevado.",
    "hint": "Subí por el tramo izquierdo hacia el fondo.",
    "start": [
      -2.2,
      1.85
    ],
    "target": {
      "type": 4,
      "pos": [
        0,
        -2.42
      ],
      "y": 0.8
    },
    "chapter": 4,
    "lesson": "Tres tramos, tres descansos",
    "briefing": "Cada rampa empieza a la altura del descanso anterior. La ruta hace dos giros claros.",
    "mechanics": [
      "Rampas",
      "Altura",
      "Portal"
    ],
    "revision": "Rampas y descansos ensanchados, con barrera lateral alejada y aterrizaje final más amplio.",
    "hints": [
      "Subí por el tramo izquierdo hacia el fondo.",
      "Sobre el primer descanso, girá a la derecha.",
      "En el segundo descanso girá al fondo; arriba, alineate con el portal."
    ]
  },
  {
    "id": 21,
    "obstacles": [
      {
        "x": 0.1,
        "z": -1.25,
        "w": 1.6,
        "d": 0.3,
        "h": 0.32
      }
    ],
    "zones": [],
    "ramps": [],
    "platforms": [
      {
        "x": 0.65,
        "z": 0.85,
        "w": 2.1,
        "d": 2.6,
        "h": 0.5
      }
    ],
    "jumpPads": [
      {
        "x": -1.25,
        "z": 1.35,
        "r": 0.45,
        "power": 4.3,
        "dx": -0.6,
        "dz": -2.6
      },
      {
        "x": 0.65,
        "z": 2.65,
        "r": 0.4,
        "power": 3.7,
        "dx": 0,
        "dz": -1.5
      }
    ],
    "bumpers": [
      {
        "x": -1.75,
        "z": 0.15,
        "r": 0.34,
        "h": 1.6,
        "strength": 3.6
      }
    ],
    "name": "Rebote aéreo",
    "objective": "Saltá, rebotá y aterrizá sobre la plataforma.",
    "hint": "El pad levanta el cubo hasta la altura del poste.",
    "start": [
      -2.25,
      2.05
    ],
    "target": {
      "type": 1,
      "pos": [
        0.65,
        0.85
      ],
      "y": 0.5
    },
    "chapter": 4,
    "lesson": "Usá el rebote lateral",
    "briefing": "Esta vez el poste es más alto. Tocarlo de costado redirige el vuelo hacia la plataforma.",
    "mechanics": [
      "Salto",
      "Bumper",
      "Aterrizaje"
    ],
    "revision": "Recorrido aéreo rediseñado: poste alcanzable desde el costado, llegada más ancha y diferencia de altura más tolerante; pad de recuperación delante de la plataforma.",
    "hints": [
      "El pad levanta el cubo hasta la altura del poste.",
      "Tocá el lado derecho del poste para salir hacia la plataforma.",
      "Saltá desde el pad izquierdo, rozá el costado derecho del poste y corregí hacia la plataforma. Si caés, usá el pad de recuperación del frente."
    ]
  },
  {
    "id": 22,
    "obstacles": [
      {
        "x": 2.4,
        "z": -0.8,
        "w": 0.35,
        "d": 1.25,
        "move": {
          "axis": "z",
          "amp": 0.35,
          "speed": 0.7,
          "phase": 0.8
        }
      }
    ],
    "zones": [
      {
        "type": 1,
        "x": 1.35,
        "z": 1,
        "y": 0.58,
        "r": 0.46
      },
      {
        "type": 2,
        "x": -1.85,
        "z": -1.35,
        "y": 0.72,
        "r": 0.48
      }
    ],
    "ramps": [
      {
        "x": -1.55,
        "z": 2.15,
        "w": 1.2,
        "d": 1.35,
        "h": 0.35,
        "dx": 0,
        "dz": -1
      },
      {
        "x": -0.1,
        "z": 1,
        "w": 1.9,
        "d": 0.8,
        "base": 0.35,
        "h": 0.58,
        "dx": 1,
        "dz": 0
      },
      {
        "x": -0.25,
        "z": -0.5,
        "w": 2.2,
        "d": 1.7,
        "base": 0.58,
        "h": 0.72,
        "dx": -1,
        "dz": -1
      }
    ],
    "platforms": [
      {
        "x": -1.55,
        "z": 1,
        "w": 1,
        "d": 0.95,
        "h": 0.35
      },
      {
        "x": 1.35,
        "z": 0.7,
        "w": 1,
        "d": 1.4,
        "h": 0.58
      },
      {
        "x": -1.85,
        "z": -1.35,
        "w": 1,
        "d": 1.3,
        "h": 0.72
      },
      {
        "x": 0,
        "z": -2.35,
        "w": 1.6,
        "d": 0.8,
        "h": 0.82
      }
    ],
    "jumpPads": [
      {
        "x": -1.85,
        "z": -1.8,
        "y": 0.72,
        "r": 0.32,
        "power": 2.4,
        "dx": 4.8,
        "dz": -1.1
      }
    ],
    "bumpers": [],
    "name": "Final vertical",
    "objective": "Completá las tres alturas y saltá hacia el portal.",
    "hint": "Verde, azul, aro y portal: no saltees los descansos.",
    "start": [
      -2.2,
      2.25
    ],
    "sequence": [
      {
        "type": 1,
        "pos": [
          -1.55,
          1
        ],
        "y": 0.35
      },
      {
        "type": 2,
        "pos": [
          1.35,
          1
        ],
        "y": 0.58
      },
      {
        "type": 3,
        "pos": [
          -1.85,
          -1.35
        ],
        "y": 0.72
      },
      {
        "type": 4,
        "pos": [
          0,
          -2.42
        ],
        "y": 0.82
      }
    ],
    "chapter": 4,
    "lesson": "Conectá todo lo aprendido",
    "briefing": "Los tres descansos están unidos. Tras estabilizarte arriba, el pad elevado abre el último salto al portal.",
    "mechanics": [
      "Secuencia",
      "Rampas",
      "Hielo",
      "Salto"
    ],
    "revision": "Circuito vertical reconstruido con conexiones continuas, superficies a su altura real y un salto final corto.",
    "hints": [
      "Verde, azul, aro y portal: no saltees los descansos.",
      "Seguí las rampas: primera hacia el fondo, segunda a la derecha, tercera en diagonal a la izquierda.",
      "Después del aro, avanzá al pad del fondo de la repisa y dirigí el salto hacia el portal."
    ]
  }
];
function freeze(value){if(value&&typeof value==="object"){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const LEVELS=freeze(rooms);
