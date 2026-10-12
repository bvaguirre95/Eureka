export const SECTIONS_DATA = [
  // ============================================================
  // 1. GESTIÓN ADMINISTRATIVA - 12
  // ============================================================
  {
    id: "admin",
    name: "Gestión Administrativa",
    questions: [
      {
        id: "A01",
        text: "¿Cuenta con un Plan de Prevención de Riesgos Laborales (1 a 10 trabajadores) aprobado y registrado en el SUT?",
        legal_ref:
          "Acuerdo Ministerial 196 (2024) Art. 4 y Art.18.\nDecisión 584 (2004) Art. 11.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A02",
        text: "¿Cuenta con un Reglamento de Higiene y Seguridad (más de 10 trabajadores) aprobado y registrado en el SUT?",
        legal_ref:
          "Código del Trabajo (2005) Art. 434.\nAcuerdo Ministerial 196 (2024) Art. 4, 19.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A03",
        text: "¿Se ha socializado a todos los trabajadores la Política de Seguridad y Salud en el Trabajo?",
        legal_ref: "Decisión 584 (2004) Art. 11.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A04",
        text: "¿Cuenta con el registro del Monitor de Seguridad e Higiene del Trabajo en la Plataforma SUT?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 19.\nAcuerdo Ministerial 196 (2024) Art. 18 y 19.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A05",
        text: "¿Cuenta con el registro del Técnico de Seguridad e Higiene del Trabajo en la Plataforma SUT?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 20.\nAcuerdo Ministerial 196 (2024) Art. 18 y 19.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A06",
        text: "¿Cuenta con el registro del Servicio Externo de Seguridad e Higiene del Trabajo en la Plataforma SUT?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 25.\nAcuerdo Ministerial 196 (2024) Art. 14.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A07",
        text: "¿Cuenta con el informe de actividades realizadas por técnico o servicio externo de seguridad e higiene del trabajo? El informe debe contener como mínimo:\n- Objetivo\n- Estadísticas básicas (accidentes de trabajo, incidentes y/o presunción de enfermedades profesionales registradas)\n- Principales actividades ejecutadas con detalle de las horas de gestión asignadas a cada actividad\n- Conclusiones\n- Registro fotográfico\n- Firmas de responsabilidad",
        legal_ref: "Acuerdo Ministerial 196 (2024) Art. 13.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A08",
        text: "¿Cuenta con el registro del profesional médico en la Plataforma SUT?",
        legal_ref: "Decreto Ejecutivo 255 (2024) Art. 21.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A09",
        text: "¿Cuenta con el registro del Delegado de Seguridad y Salud en la plataforma SUT?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 33.\nAcuerdo Ministerial 196 (2024) Art. 18 y 19.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A10",
        text: "¿Cuenta con el registro del Comité de Seguridad y Salud en la plataforma SUT?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 32.\nAcuerdo Ministerial 196 (2024) Art. 18 y 19.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A11",
        text: "¿Cuenta con informe de la gestión realizada por los miembros del Organismo Paritario? El informe debe contener como mínimo:\n- Objetivo\n- Cronograma con el detalle de las principales actividades ejecutadas conforme las funciones descritas en el Art. 39 del Decreto Ejecutivo Nro. 255\n- Conclusiones\n- Registro fotográfico\n- Firmas de responsabilidad",
        legal_ref:
          "Resolución 957 (2008) Art. 10, 13, 14.\nDecreto Ejecutivo 255 (2024) Art. 36 y Art. 38.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
      {
        id: "A12",
        text: "¿Se evidencia por escrito los procedimientos generales que establecen el deber de colaboración en la implementación de las medidas de seguridad y salud en el trabajo para aquellos empleadores que realizan actividades simultáneas en un mismo lugar y/o centro de trabajo? (Esto incluye a contratistas, subcontratistas y a todos los empleadores que deleguen o encarguen trabajos a otras personas, ya sean naturales o jurídicas, entre otros).",
        legal_ref: "Acuerdo Ministerial 196 (2024) Art. 4.",
        subsection: "Organización de seguridad y salud en el trabajo",
      },
    ],
  },

  // ============================================================
  // 2. GESTIÓN TÉCNICA - 38
  // ============================================================
  {
    id: "tecnica",
    name: "Gestión Técnica",
    questions: [
      {
        id: "T01",
        text: "¿Cuenta con un diagrama de flujo de todos los procesos productivos y/o de servicios?",
        legal_ref: "Decisión 584 (2004) Art. 11.",
        subsection: "Identificación de peligros y evaluación de riesgos laborales",
      },
      {
        id: "T02",
        text: "¿Se dispone de un descriptivo por puesto de trabajo?\nEl descriptivo debe incluir como mínimo:\n- Número de trabajadores asignados al puesto de trabajo\n- Actividades realizadas: detalle de las tareas específicas\n- Horas de actividad diarias\n- Recursos utilizados: máquinas, equipos, herramientas, materiales, agentes químicos y biológicos",
        legal_ref:
          "Decisión 584 (2004) Art. 11, 19.\nCódigo del Trabajo Art. 42.\nDecreto Ejecutivo 255 (2024) Art. 28.",
        subsection: "Identificación de peligros y evaluación de riesgos laborales",
      },
      {
        id: "T03",
        text: "¿Cuenta con un mapa de riesgos del lugar y/o centro de trabajo?\nDebe incluir:\n- Señalización de seguridad y salud en el trabajo\n- Equipos de protección personal\n- Dispositivos de parada de emergencia",
        legal_ref: "Decisión 584 (2004) Art. 11.",
        subsection: "Identificación de peligros y evaluación de riesgos laborales",
      },
      {
        id: "T04",
        text: "¿Cuenta con una matriz de identificación de peligros y evaluación de riesgos laborales por puesto de trabajo con metodología reconocida?",
        legal_ref:
          "Decisión 584 (2004) Art. 11.\nResolución 957 (2008) Art. 1.\nDecreto Ejecutivo 255 (2024) Art. 27, 28, 47.",
        subsection: "Identificación de peligros y evaluación de riesgos laborales",
      },
      {
        id: "T05",
        text: "¿Cuenta con un informe de medición de agentes físicos, químicos o biológicos?\nDebe incluir:\n- Fecha de medición\n- Nombre del puesto de trabajo\n- Número de trabajadores expuestos\n- Identificación del agente\n- Metodología utilizada\n- Resultados obtenidos\n- Comparación con norma técnica vigente\n- Firmas de responsabilidad\n- Certificados de calibración\n- Registro fotográfico",
        legal_ref:
          "Decisión 584 (2004) Art. 11, 12, 18.\nResolución 957 (2008) Art. 1.\nDecreto Ejecutivo 255 (2024) Art. 48.\nAcuerdo Ministerial 196 (2024).",
        subsection: "Higiene Industrial",
      },
      {
        id: "T06",
        text: "¿Cuenta con un informe de evaluación de riesgos de seguridad, ergonómicos y psicosociales?\nDebe incluir:\n- Fecha de evaluación\n- Nombre del puesto de trabajo\n- Número de trabajadores expuestos\n- Identificación del riesgo\n- Metodología utilizada\n- Resultados obtenidos\n- Comparación con norma técnica vigente\n- Firmas de responsabilidad\n- Registro fotográfico",
        legal_ref:
          "Decisión 584 (2004) Art. 11, 12, 18.\nResolución 957 (2008) Art. 1.\nDecreto Ejecutivo 255 (2024) Art. 44, 45, 46.\nAcuerdo Ministerial 196 (2024).",
        subsection: "Evaluación de riesgos de seguridad, ergonómicos y psicosociales",
      },
      {
        id: "T07",
        text: "¿Cuenta con un informe de las medidas de prevención y protección implementadas?\nDebe incluir:\n- Fecha de elaboración\n- Cronograma de implementación\n- Medidas conforme la jerarquía de control (eliminación, sustitución, ingeniería, administrativo, EPP)\n- Resultados obtenidos\n- Seguimiento y mejora continua\n- Firmas de responsabilidad\n- Evidencia fotográfica",
        legal_ref:
          "Decisión 584 (2004) Art. 11.\nResolución 957 (2008) Art. 1.\nCódigo del Trabajo Art. 412.\nDecreto Ejecutivo 255 (2024) Art. 49.",
        subsection: "Implementación de las medidas de prevención y protección conforme la jerarquía de controles",
      },
      {
        id: "T08",
        text: "¿Cuenta con el cálculo del riesgo residual en la matriz de riesgos?",
        legal_ref: "Resolución 957 (2008) Art. 1.",
        subsection: "Implementación de las medidas de prevención y protección conforme la jerarquía de controles",
      },
      {
        id: "T09",
        text: "¿Se ha verificado in situ la implementación de las medidas de prevención y protección?",
        legal_ref: "Decisión 584 (2004) Art. 11.",
        subsection: "Implementación de las medidas de prevención y protección conforme la jerarquía de controles",
      },

      {
        id: "T10",
        text: "¿Se ha realizado la limpieza y mantenimiento periódico de luminarias?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T11",
        text: "¿Se ha realizado mantenimiento periódico de los sistemas de ventilación?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T12",
        text: "¿Se han clasificado los agentes químicos según su categorización?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T13",
        text: "¿Los recipientes de químicos cuentan con tapas adecuadas?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T14",
        text: "¿Se almacenan agentes químicos según su compatibilidad?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T15",
        text: "¿Se dispone de fichas de datos de seguridad accesibles?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T16",
        text: "¿Los agentes químicos están etiquetados correctamente en español?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T17",
        text: "¿Se aplican lineamientos conforme norma NTE - INEN?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T18",
        text: "¿Se aplican medidas de bioseguridad?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T19",
        text: "¿Existe área para desechos biológicos?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T20",
        text: "¿Se controlan plagas o vectores?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T21",
        text: "¿El lugar de trabajo está ordenado y limpio?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T22",
        text: "¿Las áreas cuentan con iluminación adecuada?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T23",
        text: "¿Áreas de circulación delimitadas?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T24",
        text: "¿Áreas de máquinas delimitadas?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T25",
        text: "¿Rampas conforme norma?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T26",
        text: "¿Estructuras contra caídas en buen estado?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T27",
        text: "¿Paradas de emergencia señalizadas y accesibles?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T28",
        text: "¿Partes de maquinaria protegidas?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },
      {
        id: "T29",
        text: "¿Puertas y salidas señalizadas y libres de obstáculos?",
        legal_ref: "Acuerdo Ministerial 196 (2024) Anexo 3.",
        subsection: "Condiciones de Trabajo",
      },

      {
        id: "T30",
        text: "Señalización preventiva. *Cumple normativa.",
        legal_ref: "NTE INEN-ISO 3864-1.",
        subsection: "Señalización e indicaciones de seguridad",
      },
      {
        id: "T31",
        text: "Señalización prohibitiva. *Cumple normativa.",
        legal_ref: "NTE INEN-ISO 3864-1.",
        subsection: "Señalización e indicaciones de seguridad",
      },
      {
        id: "T32",
        text: "Señalización informativa. *Cumple normativa.",
        legal_ref: "NTE INEN-ISO 3864-1.",
        subsection: "Señalización e indicaciones de seguridad",
      },
      {
        id: "T33",
        text: "Señalización de obligación. *Cumple normativa.",
        legal_ref: "NTE INEN-ISO 3864-1.",
        subsection: "Señalización e indicaciones de seguridad",
      },
      {
        id: "T34",
        text: "Señalización contra incendios. *Cumple normativa.",
        legal_ref: "NTE INEN-ISO 3864-1.",
        subsection: "Señalización e indicaciones de seguridad",
      },
      {
        id: "T35",
        text: "Señalización de evacuación en caso de emergencia.",
        legal_ref: "NTE INEN-ISO 3864-1.",
        subsection: "Señalización e indicaciones de seguridad",
      },

      {
        id: "T36",
        text: "¿Cuenta con procedimientos para trabajos especiales?\nDebe incluir:\n- Objetivo\n- Responsable\n- Puesto\n- Número de trabajadores\n- Actividades\n- Riesgos\n- Medidas de control\n- Equipos de protección personal\n- Permisos\n- Registro de socialización",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 58.\nDecisión 584 (2004) Art. 11.",
        subsection: "Gestión de trabajos especiales",
      },
      {
        id: "T37",
        text: "¿Se emiten permisos de trabajo conforme procedimiento?",
        legal_ref: "Decreto Ejecutivo 255 (2024) Art. 58.",
        subsection: "Gestión de trabajos especiales",
      },
      {
        id: "T38",
        text: "¿Cuenta con registros de apertura y cierre de permisos de trabajo?",
        legal_ref:
          "Decisión 584 (2004) Art. 11.\nDecreto Ejecutivo 255 (2024) Art. 58.",
        subsection: "Gestión de trabajos especiales",
      },
    ],
  },

  // ============================================================
  // 3. GESTIÓN DEL TALENTO HUMANO - 10
  // ============================================================
  {
    id: "talento",
    name: "Gestión del Talento Humano",
    questions: [
      {
        id: "H01",
        text: "¿Se ha identificado a trabajadores que pertenecen a grupos de atención prioritaria y/o en situación de vulnerabilidad en las evaluaciones de riesgos laborales?\n- Adultos mayores\n- Mujeres en periodo de lactancia\n- Mujeres embarazadas\n- Trabajadores con discapacidad\n- Trabajadores que adolezcan de enfermedades catastróficas o de alta complejidad",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 28.\nDecisión 584 (2004) Art. 11.",
        subsection:
          "Gestión preventiva en trabajadores que pertenecen a grupos de atención prioritaria y/o en situación de vulnerabilidad",
      },
      {
        id: "H02",
        text: "¿Se evidencia de forma in situ la implementación de medidas de prevención y protección?\n- Adultos mayores\n- Mujeres en periodo de lactancia\n- Mujeres embarazadas\n- Trabajadores con discapacidad\n- Trabajadores que adolezcan de enfermedades catastróficas o de alta complejidad",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 28.\nDecisión 584 (2004) Art. 11.",
        subsection:
          "Gestión preventiva en trabajadores que pertenecen a grupos de atención prioritaria y/o en situación de vulnerabilidad",
      },
      {
        id: "H03",
        text: "¿Cuenta con la certificación de PREVENCIÓN DE RIESGOS LABORALES EN ACTIVIDADES DE ALTO RIESGO: CONSTRUCCIÓN?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024).\nAcuerdo Ministerial 196 (2024).",
        subsection: "Certificación por competencias laborales",
      },
      {
        id: "H04",
        text: "¿Cuenta con la certificación de PREVENCIÓN DE RIESGOS LABORALES EN ACTIVIDADES DE ALTO RIESGO: ENERGÍA ELÉCTRICA?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024).\nAcuerdo Ministerial 196 (2024).",
        subsection: "Certificación por competencias laborales",
      },
      {
        id: "H05",
        text: "¿El personal que opera vehículos a motor incluyendo maquinaria agrícola cuenta con la licencia de conducción acorde con su categoría según lo dispuesto por la autoridad competente?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024).\nNormativa de tránsito aplicable.",
        subsection: "Certificación por competencias laborales",
      },
      {
        id: "H06",
        text: "¿Cuenta con un registro de asistencia a inducciones o reinducciones en seguridad y salud en el trabajo? El registro debe contener como mínimo:\n- Fecha de inducción\n- Tema: riesgos laborales y medidas de prevención y protección\n- Nombres y apellidos del trabajador\n- Número de cédula\n- Firmas de los trabajadores (física o electrónica, no se aceptan firmas adulteradas)\n- Nombres, cédula y firma del técnico de SST o responsable del servicio externo\n- Material utilizado\n- Evaluación de conocimientos adquiridos",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 28.\nAcuerdo Ministerial 196 (2024).",
        subsection:
          "Educación, capacitación y formación en materia de seguridad y salud en el trabajo",
      },
      {
        id: "H07",
        text: "¿Se han efectuado campañas de comunicación en seguridad y salud en el trabajo?\n- Deben existir respaldos físicos o digitales de las campañas realizadas",
        legal_ref: "Acuerdo Ministerial 196 (2024).",
        subsection:
          "Educación, capacitación y formación en materia de seguridad y salud en el trabajo",
      },
      {
        id: "H08",
        text: "¿Cuenta con un programa de formación, capacitación y entrenamiento en seguridad y salud en el trabajo? Debe contener como mínimo:\n- Objetivos del programa\n- Diagnóstico de necesidades\n- Contenido en función de los riesgos laborales\n- Cronograma por puesto de trabajo\n- Metodología (talleres, simulacros, prácticas, etc.)\n- Duración y frecuencia\n- Responsables\n- Material utilizado\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 255 (2024) Art. 28.\nAcuerdo Ministerial 196 (2024).",
        subsection:
          "Educación, capacitación y formación en materia de seguridad y salud en el trabajo",
      },
      {
        id: "H09",
        text: "¿Cuenta con registros de asistencia a capacitaciones y entrenamientos? Debe contener como mínimo:\n- Fecha\n- Tema\n- Nombres y apellidos\n- Número de cédula\n- Firmas válidas de los trabajadores\n- Firma del responsable SST\n- Material utilizado\n- Evaluación de conocimientos adquiridos",
        legal_ref: "Acuerdo Ministerial 196 (2024).",
        subsection:
          "Educación, capacitación y formación en materia de seguridad y salud en el trabajo",
      },
      {
        id: "H10",
        text: "¿Las capacitaciones y/o entrenamientos se encuentran registrados en la plataforma SUT?",
        legal_ref: "Acuerdo Ministerial 196 (2024).",
        subsection:
          "Educación, capacitación y formación en materia de seguridad y salud en el trabajo",
      },
    ],
  },

  // ============================================================
  // 4. PROCEDIMIENTOS OPERATIVOS BÁSICOS - 27
  // ============================================================
  {
    id: "operativo",
    name: "Procedimientos Operativos Básicos",
    questions: [
      {
        id: "O01",
        text: "¿Cuenta con una matriz de exámenes médico ocupacionales por puesto de trabajo, conforme los riesgos laborales a los que se encuentren expuestos los trabajadores? La matriz deberá contener como mínimo:\n- Nombre del puesto de trabajo\n- Número de trabajadores expuestos\n- Riesgo laboral\n- Tipo de examen\n- Frecuencia de realización\n- Responsable\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 255 (2024).\nAcuerdo Ministerial 196 (2024).",
        subsection: "Vigilancia de la salud de los trabajadores",
      },
      {
        id: "O02",
        text: "¿Cuenta con un cronograma de planificación y ejecución de exámenes médico ocupacionales?",
        legal_ref:
          "Acuerdo Ministerial 196 (2024).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Vigilancia de la salud de los trabajadores",
      },
      {
        id: "O03",
        text: "¿Cuenta con un informe de resultados de los exámenes médicos ocupacionales, realizados por puesto de trabajo? El informe debe contener como mínimo:\n- Fecha de informe\n- Periodo de exámenes\n- Puesto de trabajo\n- Número de exámenes realizados\n- Tipo de examen\n- Resultados generales (datos estadísticos)\n- Acciones recomendadas\n- Firmas de responsabilidad",
        legal_ref:
          "Acuerdo Ministerial 196 (2024).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Vigilancia de la salud de los trabajadores",
      },
      {
        id: "O04",
        text: "¿Cuenta con los certificados de aptitud médica laboral de ingreso y periódicos con firma de aceptación del trabajador y firma del profesional médico?",
        legal_ref:
          "Decreto Ejecutivo 255 (2024).\nAcuerdo Ministerial 196 (2024).",
        subsection: "Vigilancia de la salud de los trabajadores",
      },
      {
        id: "O05",
        text: "¿Cuenta con un informe trimestral de indicadores de enfermedad común, enfermedad profesional y accidentes de trabajo? El informe deberá contener como mínimo:\n- Fecha\n- Periodo de evaluación\n- Indicadores\n- Conclusiones\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 255 (2024).\nAcuerdo Ministerial 196 (2024).",
        subsection: "Vigilancia de la salud de los trabajadores",
      },

      {
        id: "O06",
        text: "¿Cuenta con un procedimiento documentado de investigación de accidentes de trabajo aprobado por la máxima autoridad del lugar y/o centro de trabajo? El procedimiento debe contener como mínimo:\n- Objetivos\n- Alcance\n- Responsabilidades\n- Procedimiento de investigación (notificación, reporte, investigación, entre otros)\n- Acciones correctivas y preventivas\n- Documentación y registro",
        legal_ref:
          "Resolución IESS C.D. 513 (2016).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O07",
        text: "¿Cuenta con un registro interno de incidentes y accidentes de trabajo ocurridos en el lugar y/o centro de trabajo? El registro debe contener como mínimo:\n- Fecha y hora de incidente o accidente de trabajo\n- Nombres y apellidos del trabajador\n- Puesto de trabajo\n- Lugar de incidente o accidente de trabajo\n- Breve descripción del incidente o accidente de trabajo\n- Consecuencias",
        legal_ref:
          "Resolución IESS C.D. 513 (2016).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O08",
        text: "¿Cuenta con un informe de investigación de accidentes de trabajo? El informe debe contener como mínimo:\n- Fecha y hora del accidente de trabajo\n- Lugar del incidente\n- Nombre del trabajador accidentado\n- Puesto de trabajo\n- Descripción del accidente\n- Nombre de testigos de ser el caso\n- Causas y consecuencias del accidente de trabajo\n- Acciones inmediatas\n- Firmas de responsabilidad",
        legal_ref:
          "Resolución IESS C.D. 513 (2016).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O09",
        text: "¿Se ha reportado el accidente de trabajo a la autoridad competente? - Evidencia de reporte de accidente de trabajo",
        legal_ref: "Resolución IESS C.D. 513 (2016).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O10",
        text: "¿Se han aplicado medidas de control y/o correctivas para evitar nuevos casos de accidente de trabajo?",
        legal_ref:
          "Resolución IESS C.D. 513 (2016).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O11",
        text: "¿Cuenta con un procedimiento documentado de investigación de enfermedades profesionales aprobado por la máxima autoridad del lugar y/o centro de trabajo?",
        legal_ref:
          "Resolución IESS C.D. 513 (2016).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O12",
        text: "¿Se ha reportado la presunción de la enfermedad profesional a la autoridad competente? - Evidencia de reporte de presunción de la enfermedad profesional",
        legal_ref: "Resolución IESS C.D. 513 (2016).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },
      {
        id: "O13",
        text: "¿Se han aplicado medidas de control y/o correctivas para evitar nuevos casos de enfermedad profesional?",
        legal_ref:
          "Resolución IESS C.D. 513 (2016).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Accidentes de trabajo y enfermedades profesionales",
      },

      {
        id: "O14",
        text: "¿Cuenta con un programa anual de ejecución de inspecciones internas de seguridad y salud en el trabajo? El programa debe contener como mínimo:\n- Objetivos del programa\n- Alcance\n- Planificación de inspecciones (cronograma, áreas a inspeccionar)\n- Lista de verificación a utilizar\n- Firmas de responsabilidad",
        legal_ref: "Acuerdo Ministerial 196 (2024).",
        subsection: "Inspecciones internas de SST",
      },
      {
        id: "O15",
        text: "¿Se evidencia de forma in situ la ejecución de inspecciones internas de seguridad y salud en el trabajo, así como la implementación de medidas correctivas?",
        legal_ref: "Acuerdo Ministerial 196 (2024).",
        subsection: "Inspecciones internas de SST",
      },

      {
        id: "O16",
        text: "¿Cuenta con un plan de emergencias y contingencia implementado en el lugar y/o centro de trabajo? El plan debe contener como mínimo:\n- Objetivos\n- Alcance\n- Identificación de amenazas naturales y riesgos antrópicos\n- Procedimientos de emergencia (acciones a ejecutar antes, durante y después de una emergencia)\n- Mapa de recursos\n- Mapa de evacuación\n- Cronograma de inspecciones, pruebas y mantenimiento de los sistemas de detección y extinción de incendios, entre otros\n- Cronograma de ejecución de simulacros\n- Conformación de brigadas\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Prevención de amenazas naturales y riesgos antrópicos",
      },
      {
        id: "O17",
        text: "¿Cuenta con un informe anual de los simulacros realizados? El informe debe contener como mínimo:\n- Fecha y hora del simulacro\n- Objetivo del simulacro\n- Tipo de simulacro realizado (incendio, evacuación, emergencia médica, etc.)\n- Lugar donde se realizó el simulacro\n- Duración del simulacro\n- Lista de participantes\n- Roles asignados a los participantes\n- Descripción del simulacro\n- Incidencias y problemas\n- Lecciones aprendidas\n- Registro fotográfico\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Prevención de amenazas naturales y riesgos antrópicos",
      },
      {
        id: "O18",
        text: "¿Se evidencia que las acciones descritas en el plan de emergencia y contingencia se han implementado en el lugar y/o centro de trabajo?",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986).\nDecreto Ejecutivo 255 (2024).",
        subsection: "Prevención de amenazas naturales y riesgos antrópicos",
      },

      {
        id: "O19",
        text: "¿Cuenta con un programa de mantenimiento de instalaciones, vehículos, máquinas, equipos y herramientas? El programa debe contener como mínimo:\n- Objetivos del programa\n- Alcance\n- Inventario de activos\n- Clasificación de activos\n- Cronograma de mantenimiento (predictivo, preventivo y correctivo)\n- Frecuencia de mantenimiento\n- Responsabilidades\n- Procedimientos y protocolos\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986) Art. 11.\nAcuerdo Ministerial 196 (2024).",
        subsection:
          "Mantenimiento de instalaciones, vehículos, máquinas, equipos y herramientas",
      },
      {
        id: "O20",
        text: "¿Se evidencia de forma in situ la ejecución del programa de mantenimiento de instalaciones, vehículos, máquinas, equipos y herramientas?",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986) Art. 11.\nAcuerdo Ministerial 196 (2024).",
        subsection:
          "Mantenimiento de instalaciones, vehículos, máquinas, equipos y herramientas",
      },

      {
        id: "O21",
        text: "¿Cuenta con un procedimiento de adquisición de equipos de protección personal y ropa de trabajo? El procedimiento debe contener como mínimo:\n- Objetivo\n- Alcance\n- Responsabilidades\n- Identificación de necesidades (evaluación de riesgos laborales, proformas, entre otros)\n- Matriz de equipos de protección personal, colectiva y ropa de trabajo por puesto de trabajo (especificaciones técnicas, lineamientos para el uso, mantenimiento, reposición y disposición final, entre otros)\n- Firmas de responsabilidad",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986) Art. 175.\nAcuerdo Ministerial 196 (2024).",
        subsection: "Equipos de protección personal y ropa de trabajo",
      },
      {
        id: "O22",
        text: "¿Cuenta con un registro de entrega recepción del equipo de protección personal y ropa de trabajo a los trabajadores? El registro debe contener como mínimo:\n- Fecha de entrega\n- Nombres y apellidos del trabajador\n- Número de cédula\n- Detalles del EPP y/o ropa de trabajo entregado\n- Firmas de los trabajadores (física o electrónica, no se aceptan firmas pegadas o adulteradas)\n- Registro de devoluciones para su respectiva reposición",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986) Art. 175-178.\nAcuerdo Ministerial 196 (2024).",
        subsection: "Equipos de protección personal y ropa de trabajo",
      },
      {
        id: "O23",
        text: "¿Se evidencia de forma in situ la correcta utilización de los equipos de protección personal y colectiva y ropa de trabajo?",
        legal_ref:
          "Decreto Ejecutivo 2393 (1986) Art. 175-178.\nAcuerdo Ministerial 196 (2024).",
        subsection: "Equipos de protección personal y ropa de trabajo",
      },

      {
        id: "O24",
        text: "¿Se ha implementado el programa de prevención de riesgo psicosocial? Presentar los respaldos de la implementación de cada una de las actividades del programa:\n- Actividad 1\n- Actividad 2\n- Actividad 3\n- Actividad 4\n- Actividad 5\n- Actividad 6\n- Actividad 7\n- Actividad 8\n- Actividad 9\n- Actividad 10\n- Actividad 11\n- Actividad 12",
        legal_ref:
          "Acuerdo Ministerial 196 (2024).\nNormativa vigente sobre prevención de riesgos psicosociales.",
        subsection: "Programas de prevención en SST",
      },
      {
        id: "O25",
        text: "¿Se ha registrado el programa de prevención de riesgo psicosocial en el SUT?",
        legal_ref:
          "Acuerdo Ministerial 196 (2024).\nNormativa vigente sobre prevención de riesgos psicosociales.",
        subsection: "Programas de prevención en SST",
      },
      {
        id: "O26",
        text: "¿Se ha implementado el programa de prevención integral del uso y consumo de alcohol, tabaco u otras drogas en los espacios laborales públicos y privados? Presentar los respaldos de la implementación de cada una de las actividades del programa:\n- Actividad 1\n- Actividad 2\n- Actividad 3\n- Actividad 4\n- Actividad 5\n- Actividad 6\n- Actividad 7\n- Actividad 8\n- Actividad 9\n- Actividad 10\n- Actividad 11\n- Actividad 12\n- Actividad 13\n- Actividad 14",
        legal_ref:
          "Acuerdo Ministerial 196 (2024).\nNormativa vigente sobre prevención integral del uso y consumo de alcohol, tabaco y otras drogas.",
        subsection: "Programas de prevención en SST",
      },
      {
        id: "O27",
        text: "¿Se ha registrado el programa de prevención integral del uso y consumo de alcohol, tabaco u otras drogas en los espacios laborales públicos y privados en el SUT?",
        legal_ref:
          "Acuerdo Ministerial 196 (2024).\nNormativa vigente sobre prevención integral del uso y consumo de alcohol, tabaco y otras drogas.",
        subsection: "Programas de prevención en SST",
      },
    ],
  },

  // ============================================================
  // 5. SERVICIOS PERMANENTES - 9
  // ============================================================
  {
    id: "servicios",
    name: "Servicios Permanentes",
    questions: [
      {
        id: "S01",
        text: "¿Cuenta con botiquín de emergencia para primeros auxilios?",
        legal_ref: "Código de Trabajo (2005) Art. 430.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S02",
        text: "¿El comedor cuenta con una adecuada salubridad y ambientación?\nAplica para centros de trabajo con cincuenta o más trabajadores y situados a más de dos kilómetros de la población más cercana.",
        legal_ref: "Código de Trabajo (2005) Art. 42.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S03",
        text: "¿En caso de existir servicios de cocina, se cuenta con una adecuada salubridad y almacenamiento de productos alimenticios?",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S04",
        text: "¿En el lugar y/o centro de trabajo se dispone de abastecimiento de agua para el consumo humano?",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S05",
        text: "¿Cuenta con servicios higiénicos, excusados y urinarios en buenas condiciones con separación para hombres y mujeres?",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S06",
        text: "¿Cuenta con duchas en buenas condiciones?",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S07",
        text: "¿Cuenta con lavabos en buenas condiciones y con útiles de aseo personal?",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S08",
        text: "¿Se dispone de vestuarios, separados por sexo, limpios y en buenas condiciones?",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
      {
        id: "S09",
        text: "¿Cuenta con campamentos en buenas condiciones?\nDebe incluir:\n- Luz eléctrica\n- Ventilación\n- Agua para el consumo humano\n- Servicios higiénicos (excusado, lavabo, duchas)\n- Comedores\n- Alojamiento y vestuarios separados para hombres y mujeres",
        legal_ref: "Acuerdo Ministerial 196 (2024). Anexo 3.",
        subsection: "Servicios Permanentes",
      },
    ],
  },
];
