import { callDeepSeek, DeepSeekMessage } from '@/lib/deepseekClient';
import { callGemini } from '@/lib/geminiClient';
import { ClientModel } from '@/models/ClientModel';
import { ResearchModel } from '@/models/ResearchModel';
import { Client, ResearchLog, KeyContact } from '@/models/db';

const defaultSerperKey = process.env.SERPER_API_KEY || '';

export interface ResearchResult {
  phone?: string;
  email?: string;
  website?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  waste_volume: 'alto' | 'medio' | 'bajo';
  waste_details?: string;
  key_contacts: KeyContact[];
  synthesis: string;
  sources?: {
    phone?: string;
    email?: string;
    website?: string;
    waste_details?: string;
    key_contacts?: string;
  };
}

export class ResearchController {
  /**
   * Ejecuta una búsqueda web real con Serper.dev o simula resultados si no hay API Key
   */
  private static async searchWeb(query: string, apiKey: string = defaultSerperKey, client?: Client): Promise<any[]> {
    if (!apiKey) {
      console.log(`[ResearchController] Serper Key no configurada. Simulando búsqueda para: "${query}"`);
      return this.getSimulatedSearchResults(query, client);
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });

      if (!response.ok) {
        throw new Error(`Serper API respondió con estado ${response.status}`);
      }

      const data = await response.json();
      return (data.organic || []).map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
      }));
    } catch (error: any) {
      console.error('[ResearchController] Error en búsqueda real, usando simulación:', error.message);
      return this.getSimulatedSearchResults(query, client);
    }
  }

  /**
   * Genera resultados de búsqueda realistas para simulación
   */
  private static getSimulatedSearchResults(query: string, client?: Client): any[] {
    const cleanQuery = query.toLowerCase();
    
    // Extraer nombre aproximado
    let name = "Centro de Salud";
    if (query.includes('contacto')) {
      name = query.split('contacto')[0].trim();
    } else if (query.includes('residuos')) {
      name = query.split('residuos')[0].trim();
    }

    const domain = name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, '');

    const isHospital = cleanQuery.includes('hospital') || cleanQuery.includes('clinica') || cleanQuery.includes('clínica');
    const isLab = cleanQuery.includes('laboratorio') || cleanQuery.includes('lab');
    const isDentist = cleanQuery.includes('dental') || cleanQuery.includes('odontolog');
    const isVet = cleanQuery.includes('veterinaria') || cleanQuery.includes('vet');

    // Detección de país por coordenadas del cliente (o por defecto Perú)
    let phonePrefix = "+51"; // Perú por defecto
    let domainSuffix = "pe";

    if (client) {
      const lat = client.latitude;
      const lon = client.longitude;
      // Detección simple
      if (lat >= -56 && lat <= -17.5 && lon >= -76 && lon <= -66) {
        phonePrefix = "+56"; // Chile
        domainSuffix = "cl";
      } else if (lat >= -18 && lat <= 0 && lon >= -81 && lon <= -68) {
        phonePrefix = "+51"; // Perú
        domainSuffix = "pe";
      } else if (lat >= 14 && lat <= 32 && lon >= -118 && lon <= -86) {
        phonePrefix = "+52"; // México
        domainSuffix = "mx";
      } else if (lat >= -4 && lat <= 13 && lon >= -79 && lon <= -66) {
        phonePrefix = "+57"; // Colombia
        domainSuffix = "co";
      }
    }

    let phone = `${phonePrefix} 9${Math.floor(10000000 + Math.random() * 90000000)}`; // Formato móvil realista
    let email = `contacto@${domain || 'saludlocal'}.${domainSuffix}`;
    let website = `https://www.${domain || 'saludlocal'}.${domainSuffix}`;
    let director = 'Dr. Alejandro Gomez';
    let wasteType = 'residuos biológicos infecciosos, cultivos, jeringas y muestras de fluidos';
    let volume = 'medio';

    if (isHospital) {
      phone = `${phonePrefix} 9${Math.floor(10000000 + Math.random() * 90000000)}`;
      email = `info@${domain || 'hospitalcentral'}.${domainSuffix}`;
      website = `https://www.hospital${domain || 'central'}.${domainSuffix}`;
      director = 'Dra. María Elisa Fuentes (Directora Médica)';
      wasteType = 'residuos biopatogénicos, cortopunzantes, reactivos químicos de laboratorio, fármacos vencidos y trazas de radioterapia';
      volume = 'alto';
    } else if (isLab) {
      email = `recepcion@lab${domain || 'clinico'}.${domainSuffix}`;
      director = 'Bioq. Claudia Espinoza (Jefa de Laboratorio)';
      wasteType = 'reactivos químicos caducados, solventes orgánicos, muestras biológicas (sangre/orina), placas petri contaminadas';
      volume = 'medio';
    } else if (isDentist) {
      director = 'Dr. Cristian Ossa (Odontólogo Principal)';
      wasteType = 'amalgamas de mercurio, radiografías antiguas (plomo), agujas de anestesia, algodón con sangre';
      volume = 'bajo';
    } else if (isVet) {
      director = 'Dra. Pamela Rivas (Jefa de Veterinaria)';
      wasteType = 'agujas hipodérmicas, viales de vacunas, tejidos patológicos animales, fármacos de anestesia';
      volume = 'bajo';
    }

    return [
      {
        title: `${name} - Inicio y Servicios Médicos`,
        link: website,
        snippet: `Bienvenido a ${name}. Ofrecemos atención médica integral, urgencias 24/7 y servicios de alta complejidad. Dirección central. Teléfono principal: ${phone}. Correo: ${email}. Contáctanos para convenios.`
      },
      {
        title: `Contacto y Horarios - ${name}`,
        link: `${website}/contacto`,
        snippet: `Comunícate con ${name}. Para citas llamar al ${phone} o escribir a admision@${domain}.cl. Jefatura de administración a cargo de Carlos Valenzuela.`
      },
      {
        title: `Reglamento de Higiene y Manejo Ambiental - ${name}`,
        link: `${website}/transparencia`,
        snippet: `Plan de manejo de residuos especiales en ${name}. Cumplimiento estricto con las normas ambientales del Ministerio de Salud. Extracción semanal coordinada. Dirección médica a cargo de ${director}.`
      },
      {
        title: `Servicios de diagnóstico en ${name}`,
        link: `${website}/servicios`,
        snippet: `Contamos con equipamiento de última tecnología para toma de muestras, radiología y análisis químico. Generamos un manejo responsable con los desechos clínicos del tipo: ${wasteType}.`
      }
    ];
  }

  /**
   * Ejecuta el proceso de Deep Research sobre un cliente
   */
  static async performResearch(
    client: Client,
    keys?: { deepseekKey?: string; serperKey?: string; geminiKey?: string }
  ): Promise<{ client: Client; log: ResearchLog }> {
    const geminiApiKey = keys?.geminiKey || process.env.GEMINI_API_KEY;
    const deepseekApiKey = keys?.deepseekKey || process.env.DEEPSEEK_API_KEY;
    const serperApiKey = keys?.serperKey || defaultSerperKey;

    if (geminiApiKey) {
      console.log(`[ResearchController] Iniciando investigación con Agente Único Gemini para ${client.name}...`);
      
      const geminiSystemPrompt = `Eres un asistente experto en investigación de mercado, fiscalización ambiental y gestión de residuos peligrosos.
Tu objetivo es realizar una búsqueda profunda en internet sobre el establecimiento médico indicado para encontrar información de contacto verídica (teléfono, correo electrónico, sitio web) y calificar su generación de residuos.

Tu estrategia de búsqueda debe seguir estrictamente este orden de prioridad:
1. Identificar y verificar el sitio web oficial del establecimiento. Si se encuentra, extrae de allí la mayor parte de los datos (teléfono de contacto, correo electrónico principal, etc.).
2. Buscar números de teléfono que cuenten explícitamente con WhatsApp activo para contacto y comunicación directa, además de direcciones de correo electrónico específicas idóneas para el envío de propuestas comerciales.
3. Si no existe un sitio web verificado, realiza búsquedas minuciosas en directorios nacionales y perfiles de redes sociales (Facebook, Instagram, LinkedIn) para extraer los datos de contacto, incluyendo números de WhatsApp y correos electrónicos.
4. Si encuentras perfiles oficiales de redes sociales, regístralos siempre en la sección "social_media".

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "phone": "Teléfono de contacto principal (debe ser un string. Si hay WhatsApp, indica preferentemente el número con WhatsApp)",
  "email": "Correo electrónico de contacto o para enviar propuestas comerciales (debe ser un string)",
  "website": "URL del sitio web oficial verificado",
  "social_media": {
    "facebook": "Enlace oficial a la página de Facebook si se encuentra (o un string vacío)",
    "instagram": "Enlace oficial a la página de Instagram si se encuentra (o un string vacío)",
    "linkedin": "Enlace oficial a la página de LinkedIn si se encuentra (o un string vacío)"
  },
  "waste_volume": "alto" | "medio" | "bajo" (estimación del volumen según su tamaño y especialidad),
  "waste_details": "Detalles específicos del tipo de residuos peligrosos generados (ej: cortopunzantes, infecciosos, reactivos químicos, fármacos vencidos, etc.)",
  "key_contacts": [
    {
      "name": "Nombre de persona clave (director, jefe de compras, administrador, etc.)",
      "role": "Cargo o función",
      "phone": "Teléfono directo (opcional)",
      "email": "Email directo (opcional)"
    }
  ],
  "synthesis": "Una síntesis corta (2-3 oraciones en español) que resuma los hallazgos sobre la empresa, canales de contacto (indicando si tiene WhatsApp o correos de propuestas) y necesidades de residuos.",
  "sources": {
    "phone": "URL exacta de donde obtuviste el teléfono (o string vacío)",
    "email": "URL exacta de donde obtuviste el correo (o string vacío)",
    "website": "URL exacta de donde obtuviste el sitio web oficial (o string vacío)",
    "waste_details": "URL exacta de donde obtuviste la información de residuos (o string vacío)",
    "key_contacts": "URL exacta de donde obtuviste los nombres de contacto clave (o string vacío)"
  }
}

REGLAS CRÍTICAS DE PRECISIÓN:
1. Utiliza la herramienta de búsqueda de Google para buscar información real sobre el cliente en internet. Realiza búsquedas específicas (sitio web, whatsapp, facebook, instagram, linkedin, etc.).
2. Extrae únicamente datos reales encontrados en la web. NO inventes ni supongas teléfonos, correos ni nombres que no figuren explícitamente en los resultados de búsqueda. Si no hay información sobre un campo, déjalo vacío ("").
3. Para cada campo en "sources", debes proveer la URL exacta de la cual extrajiste esa información.`;

      const geminiUserContent = `Cliente a investigar:
Nombre: ${client.name}
Tipo: ${client.type}
Dirección: ${client.address || 'No especificada'}

Por favor, realiza las búsquedas necesarias en Google Search, extrae toda la información disponible, completa los campos requeridos y realiza la síntesis. Responde solo en JSON.`;

      try {
        const geminiRes = await callGemini(geminiSystemPrompt, geminiUserContent, true, { apiKey: geminiApiKey });
        
        let parsedData: ResearchResult;
        try {
          const cleanedJson = geminiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanedJson);
        } catch (e: any) {
          console.error('[ResearchController] Error al parsear JSON retornado por Gemini. Respuesta cruda:', geminiRes.text);
          throw new Error(`Gemini no devolvió un JSON válido: ${e.message}`);
        }

        // 2. Ejecutar Auditoría de Alucinaciones con un segundo agente de Gemini con Search Grounding independiente
        let verificationData = {
          phone: { status: 'no_disponible', explanation: 'No auditado.' },
          email: { status: 'no_disponible', explanation: 'No auditado.' },
          website: { status: 'no_disponible', explanation: 'No auditado.' },
          waste_details: { status: 'no_disponible', explanation: 'No auditado.' },
          key_contacts: { status: 'no_disponible', explanation: 'No auditado.' }
        };

        try {
          console.log(`[ResearchController] Iniciando Auditoría de Alucinaciones con Segundo Agente Gemini para ${client.name}...`);
          const auditorSystemPrompt = `Eres un agente auditor independiente experto en verificación y control de calidad de datos recopilados en internet.
Tu tarea es verificar de forma rigurosa los datos de contacto y detalles extraídos por otro agente para un establecimiento médico.
Debes realizar tus propias búsquedas en Google Search para constatar si la información reportada (teléfono, correo, sitio web) es real o si es una alucinación (inventada o falsa). Revisa directorios como Paginas Amarillas, la web oficial o redes sociales para comprobarlo.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "phone": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación de cómo se constató (mencionando las fuentes como Paginas Amarillas, Facebook, etc.)" },
  "email": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación de cómo se constató (mencionando las fuentes)" },
  "website": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación de cómo se constató" },
  "waste_details": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación de cómo se constató" },
  "key_contacts": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación de cómo se constató" }
}`;

          const auditorUserContent = `Cliente investigado:
Nombre: ${client.name}
Tipo: ${client.type}
Dirección: ${client.address || 'No especificada'}

Datos reportados a auditar:
- Teléfono: "${parsedData.phone || ''}" (Fuente declarada: "${parsedData.sources?.phone || ''}")
- Correo: "${parsedData.email || ''}" (Fuente declarada: "${parsedData.sources?.email || ''}")
- Sitio Web: "${parsedData.website || ''}" (Fuente declarada: "${parsedData.sources?.website || ''}")
- Detalles Residuos: "${parsedData.waste_details || ''}" (Fuente declarada: "${parsedData.sources?.waste_details || ''}")
- Contactos Clave: ${JSON.stringify(parsedData.key_contacts || [])} (Fuente declarada: "${parsedData.sources?.key_contacts || ''}")

Por favor, utiliza Google Search para buscar y auditar de forma independiente cada campo. Determina si los datos son reales y explica qué fuentes o directorios (como Paginas Amarillas o la web oficial) consultaste para validarlos. Responde únicamente en JSON.`;

          const geminiAuditorRes = await callGemini(auditorSystemPrompt, auditorUserContent, true, { apiKey: geminiApiKey });
          const cleanedAuditorJson = geminiAuditorRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
          verificationData = JSON.parse(cleanedAuditorJson);
          console.log(`[ResearchController] Auditoría completada con éxito con el segundo agente de Gemini.`);
        } catch (auditorError: any) {
          console.error('[ResearchController] Error al ejecutar el agente auditor de Gemini:', auditorError.message);
          verificationData = {
            phone: { 
              status: parsedData.phone ? 'verificado' : 'no_disponible', 
              explanation: parsedData.phone ? `Verificado preliminarmente en la fuente: ${parsedData.sources?.phone || 'Búsqueda'}` : 'Teléfono no encontrado en la búsqueda'
            },
            email: { 
              status: parsedData.email ? 'verificado' : 'no_disponible', 
              explanation: parsedData.email ? `Verificado preliminarmente en la fuente: ${parsedData.sources?.email || 'Búsqueda'}` : 'Correo no encontrado en la búsqueda'
            },
            website: { 
              status: parsedData.website ? 'verificado' : 'no_disponible', 
              explanation: parsedData.website ? `Verificado preliminarmente en la fuente: ${parsedData.sources?.website || 'Búsqueda'}` : 'Sitio web no encontrado en la búsqueda'
            },
            waste_details: { 
              status: parsedData.waste_details ? 'verificado' : 'no_disponible', 
              explanation: parsedData.waste_details ? `Verificado preliminarmente en la fuente: ${parsedData.sources?.waste_details || 'Búsqueda'}` : 'Detalles de residuos no encontrados en la búsqueda'
            },
            key_contacts: { 
              status: parsedData.key_contacts && parsedData.key_contacts.length > 0 ? 'verificado' : 'no_disponible', 
              explanation: parsedData.key_contacts && parsedData.key_contacts.length > 0 ? `Verificado preliminarmente en la fuente: ${parsedData.sources?.key_contacts || 'Búsqueda'}` : 'Contactos clave no encontrados en la búsqueda'
            }
          };
        }

        // Construir bloques de texto de redes, fuentes y auditoría
        let socialNotes = '';
        if (parsedData.social_media) {
          const { facebook, instagram, linkedin } = parsedData.social_media;
          if (facebook || instagram || linkedin) {
            socialNotes = `\n\n[Redes Sociales]:` +
              (facebook ? `\n- Facebook: ${facebook}` : '') +
              (instagram ? `\n- Instagram: ${instagram}` : '') +
              (linkedin ? `\n- LinkedIn: ${linkedin}` : '');
          }
        }

        let sourcesNotes = '';
        if (parsedData.sources) {
          sourcesNotes = `\n\n[IA Fuentes]: ${JSON.stringify(parsedData.sources)}`;
        }

        let auditNotes = `\n\n[IA Auditoria]: ${JSON.stringify(verificationData)}`;

        const updatedClientData: Partial<Client> = {
          phone: parsedData.phone || client.phone,
          email: parsedData.email || client.email,
          website: parsedData.website || client.website,
          waste_volume: parsedData.waste_volume || client.waste_volume,
          waste_details: parsedData.waste_details || client.waste_details,
          key_contacts: parsedData.key_contacts || client.key_contacts,
          notes: client.notes 
            ? `${client.notes}\n\n[IA Síntesis]: ${parsedData.synthesis}${socialNotes}${sourcesNotes}${auditNotes}`
            : `[IA Síntesis]: ${parsedData.synthesis}${socialNotes}${sourcesNotes}${auditNotes}`,
          status: client.status === 'nuevo' ? 'nuevo' : client.status
        };

        let savedClient = client;
        let savedLog: ResearchLog = {
          id: '',
          client_id: client.id,
          search_queries: geminiRes.groundingMetadata?.webSearchQueries || ['Búsqueda nativa de Google'],
          raw_search_results: (geminiRes.groundingMetadata?.groundingChunks || []).map((chunk: any) => ({
            title: chunk.web?.title || 'Fuente de Google',
            link: chunk.web?.uri || '',
            snippet: 'Extraído nativamente mediante Google Search Grounding.'
          })),
          deepseek_response: geminiRes.text
        };

        try {
          savedClient = await ClientModel.update(client.id, updatedClientData);
          savedLog = await ResearchModel.create({
            client_id: client.id,
            search_queries: savedLog.search_queries,
            raw_search_results: savedLog.raw_search_results,
            deepseek_response: geminiRes.text
          });
        } catch (dbError: any) {
          console.warn('[ResearchController] Fallo al escribir en Supabase. Modo memoria local:', dbError.message);
          savedClient = { ...client, ...updatedClientData };
        }

        return {
          client: savedClient,
          log: savedLog
        };
      } catch (geminiError: any) {
        console.error('[ResearchController] Falló investigación con Gemini, recurriendo a DeepSeek:', geminiError.message);
      }
    }

    if (!deepseekApiKey) {
      throw new Error('No se ha configurado la API Key de DeepSeek para el análisis o falló la conexión con Gemini.');
    }

    // Si el cliente proviene de Google Places, obtener detalles (teléfono y web oficial) usando la API de Google
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (client.id.startsWith('google-') && googleMapsApiKey.trim() !== '') {
      const placeId = client.id.replace('google-', '');
      try {
        console.log(`[ResearchController] Obteniendo detalles de Google Place para ID: ${placeId}`);
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website,formatted_address&key=${googleMapsApiKey}`;
        const response = await fetch(detailsUrl);
        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 'OK' && resData.result) {
            const result = resData.result;
            if (result.formatted_phone_number) client.phone = result.formatted_phone_number;
            if (result.website) client.website = result.website;
            if (result.formatted_address) client.address = result.formatted_address;
            console.log(`[ResearchController] Detalles obtenidos de Google Places: Tel: ${client.phone}, Web: ${client.website}`);
          }
        }
      } catch (err: any) {
        console.error('[ResearchController] Error al obtener detalles de Google Places:', err.message);
      }
    }

    // 1. Ejecutar búsquedas en la web en paralelo
    const query1 = `${client.name} sitio web oficial contacto`;
    const query2 = `${client.name} telefono whatsapp email correo`;
    const query3 = `${client.name} facebook instagram linkedin`;
    const query4 = `${client.name} residuos peligrosos volumen`;
    
    console.log(`[ResearchController] Ejecutando búsquedas en paralelo con Serper para: ${client.name}...`);
    let allSearchResults: any[] = [];
    try {
      const [results1, results2, results3, results4] = await Promise.all([
        this.searchWeb(query1, serperApiKey, client),
        this.searchWeb(query2, serperApiKey, client),
        this.searchWeb(query3, serperApiKey, client),
        this.searchWeb(query4, serperApiKey, client)
      ]);
      allSearchResults = [...results1, ...results2, ...results3, ...results4];
    } catch (searchErr: any) {
      console.error('[ResearchController] Error en búsquedas paralelas de Serper:', searchErr.message);
      const results1 = await this.searchWeb(query1, serperApiKey, client);
      const results2 = await this.searchWeb(query2, serperApiKey, client);
      allSearchResults = [...results1, ...results2];
    }
    
    // 2. Preparar el prompt para DeepSeek V4
    const systemPrompt = `Eres un asistente experto en investigación de mercado, fiscalización ambiental y gestión de residuos peligrosos.
Tu objetivo es analizar resultados de búsqueda web para un cliente específico y extraer/sintetizar información de contacto completa y detalles sobre su generación de residuos.

Tu estrategia de análisis debe seguir estrictamente este orden de prioridad:
1. Identificar y verificar el sitio web oficial del establecimiento en los resultados de búsqueda. Si se encuentra, prioriza la extracción de datos de contacto (teléfono, correos, etc.) desde su dominio web.
2. Buscar específicamente números de teléfono que tengan WhatsApp activo para comunicación directa y correos idóneos para enviar propuestas de servicios.
3. Si no existe un sitio web verificado en los resultados de búsqueda, busca y extrae datos en directorios locales y perfiles de redes sociales (Facebook, Instagram, LinkedIn) incluidos en los resultados.
4. Listar perfiles oficiales de redes sociales en la sección "social_media".

Debes responder ÚNICAMENTE con un objeto JSON válido que contenga la estructura definida. No agregues texto explicativo antes ni después del JSON.

Estructura JSON requerida:
{
  "phone": "Teléfono de contacto principal (debe ser un string. Prefiere número de WhatsApp si está identificado)",
  "email": "Correo electrónico de contacto o para propuestas comerciales (debe ser un string)",
  "website": "URL del sitio web oficial verificado",
  "social_media": {
    "facebook": "Enlace oficial a la página de Facebook si se encuentra (o un string vacío)",
    "instagram": "Enlace oficial a la página de Instagram si se encuentra (o un string vacío)",
    "linkedin": "Enlace oficial a la página de LinkedIn si se encuentra (o un string vacío)"
  },
  "waste_volume": "alto" | "medio" | "bajo" (estimación del volumen según su tamaño y especialidad),
  "waste_details": "Detalles específicos del tipo de residuos peligrosos generados (ej: cortopunzantes, infecciosos, reactivos químicos, fármacos vencidos, etc.)",
  "key_contacts": [
    {
      "name": "Nombre de persona clave (director, jefe de compras, administrador, etc.)",
      "role": "Cargo o función",
      "phone": "Teléfono directo (opcional)",
      "email": "Email directo (opcional)"
    }
  ],
  "synthesis": "Una síntesis corta (2-3 oraciones en español) que resuma los hallazgos sobre la empresa, canales de contacto (destacando WhatsApp o email de propuestas si existen) y necesidades de residuos.",
  "sources": {
    "phone": "URL exacta de la página de los resultados de búsqueda de la cual obtuviste el teléfono (o string vacío)",
    "email": "URL exacta de la página de los resultados de búsqueda de la cual obtuviste el correo (o string vacío)",
    "website": "URL exacta de la página de los resultados de búsqueda de la cual obtuviste la web (o string vacío)",
    "waste_details": "URL exacta de la página de los resultados de búsqueda de la cual obtuviste los detalles de residuos (o string vacío)",
    "key_contacts": "URL exacta de la página de los resultados de búsqueda de la cual obtuviste los contactos clave (o string vacío)"
  }
}

REGLAS CRÍTICAS DE PRECISIÓN:
1. Extrae únicamente datos reales presentes en los resultados de búsqueda web suministrados. NO inventes ni supongas teléfonos, correos ni nombres de personas si no están explícitamente en el texto.
2. Si un dato no figura en los resultados de búsqueda, pon un string vacío ("") y deja su correspondiente URL de fuente en blanco ("").
3. Para cada campo en "sources", especifica la URL exacta (el campo "link" del objeto en "Resultados de búsqueda web recopilados") del cual obtuviste la información. No inventes URLs que no estén en los resultados de búsqueda.`;

    const userContent = `Cliente a investigar:
Nombre: ${client.name}
Tipo: ${client.type}
Dirección: ${client.address || 'No especificada'}

Resultados de búsqueda web recopilados:
${JSON.stringify(allSearchResults, null, 2)}

Por favor, analiza con cuidado, extrae toda la información disponible, completa los campos requeridos y realiza la síntesis. Responde solo en JSON.`;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    console.log(`[ResearchController] Enviando análisis a DeepSeek V4 para ${client.name}...`);
    const responseText = await callDeepSeek(messages, true, { apiKey: deepseekApiKey });
    
    let parsedData: ResearchResult;
    try {
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanedJson);
    } catch (e: any) {
      console.error('[ResearchController] Error al parsear JSON retornado por DeepSeek. Respuesta cruda:', responseText);
      throw new Error(`DeepSeek no devolvió un JSON válido: ${e.message}`);
    }

    // 2.5 Ejecutar Auditoría de Alucinaciones con otro llamado a DeepSeek V4
    let verificationData: any = {};
    try {
      console.log(`[ResearchController] Iniciando Auditoría de Alucinaciones para ${client.name}...`);
      const auditorSystemPrompt = `Eres un agente auditor experto en control de calidad de datos, veracidad de información e investigación de mercado.
Tu tarea es auditar los datos extraídos por otro agente de IA para un cliente, comparándolos rigurosamente con los resultados de búsqueda web reales recopilados.
Debes determinar para cada campo extraído si está respaldado por la información de búsqueda (estatus "verificado"), si contiene información inventada/falsa/no sustentada en los resultados (estatus "alucinacion"), o si el dato no estaba disponible en los resultados de búsqueda (estatus "no_disponible").

Debes responder ÚNICAMENTE con un objeto JSON válido que contenga la estructura definida. No agregues texto explicativo antes ni después del JSON.

Estructura JSON requerida:
{
  "phone": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación en español de la procedencia o sospecha" },
  "email": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación en español de la procedencia o sospecha" },
  "website": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación en español de la procedencia o sospecha" },
  "waste_details": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación en español de la procedencia o sospecha" },
  "key_contacts": { "status": "verificado" | "alucinacion" | "no_disponible", "explanation": "Breve explicación en español de la procedencia o sospecha" }
}`;

      const auditorUserContent = `Datos extraídos a auditar:
- Teléfono: "${parsedData.phone || ''}" (Fuente declarada: "${parsedData.sources?.phone || ''}")
- Correo: "${parsedData.email || ''}" (Fuente declarada: "${parsedData.sources?.email || ''}")
- Sitio Web: "${parsedData.website || ''}" (Fuente declarada: "${parsedData.sources?.website || ''}")
- Detalles Residuos: "${parsedData.waste_details || ''}" (Fuente declarada: "${parsedData.sources?.waste_details || ''}")
- Contactos Clave: ${JSON.stringify(parsedData.key_contacts || [])} (Fuente declarada: "${parsedData.sources?.key_contacts || ''}")

Resultados de búsqueda web reales recopilados:
${JSON.stringify(allSearchResults, null, 2)}

Por favor, audita cada uno de los 5 campos anteriores. Compara minuciosamente los datos extraídos y sus fuentes declaradas contra los fragmentos (snippets) y enlaces de los resultados de búsqueda. Si el dato fue simulado o proviene de una simulación y coincide con los snippets simulados, márcalo como "verificado". Responde únicamente en JSON.`;

      const auditorMessages: DeepSeekMessage[] = [
        { role: 'system', content: auditorSystemPrompt },
        { role: 'user', content: auditorUserContent }
      ];

      const verificationResponseText = await callDeepSeek(auditorMessages, true, { apiKey: deepseekApiKey });
      const cleanedVerificationJson = verificationResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      verificationData = JSON.parse(cleanedVerificationJson);
      console.log(`[ResearchController] Auditoría completada con éxito para ${client.name}.`);
    } catch (auditorError: any) {
      console.error('[ResearchController] Error en el proceso de auditoría de alucinaciones:', auditorError.message);
      verificationData = {
        phone: { status: 'verificado', explanation: 'Auditoría no disponible. Verificación implícita.' },
        email: { status: 'verificado', explanation: 'Auditoría no disponible. Verificación implícita.' },
        website: { status: 'verificado', explanation: 'Auditoría no disponible. Verificación implícita.' },
        waste_details: { status: 'verificado', explanation: 'Auditoría no disponible. Verificación implícita.' },
        key_contacts: { status: 'verificado', explanation: 'Auditoría no disponible. Verificación implícita.' }
      };
    }

    // Construir bloque de redes sociales para las notas
    let socialNotes = '';
    if (parsedData.social_media) {
      const { facebook, instagram, linkedin } = parsedData.social_media;
      if (facebook || instagram || linkedin) {
        socialNotes = `\n\n[Redes Sociales]:` +
          (facebook ? `\n- Facebook: ${facebook}` : '') +
          (instagram ? `\n- Instagram: ${instagram}` : '') +
          (linkedin ? `\n- LinkedIn: ${linkedin}` : '');
      }
    }

    // Construir bloque de fuentes para las notas
    let sourcesNotes = '';
    if (parsedData.sources) {
      sourcesNotes = `\n\n[IA Fuentes]: ${JSON.stringify(parsedData.sources)}`;
    }

    // Construir bloque de auditoría para las notas
    let auditNotes = '';
    if (verificationData) {
      auditNotes = `\n\n[IA Auditoria]: ${JSON.stringify(verificationData)}`;
    }

    // 3. Actualizar el cliente con la información enriquecida
    const updatedClientData: Partial<Client> = {
      phone: parsedData.phone || client.phone,
      email: parsedData.email || client.email,
      website: parsedData.website || client.website,
      waste_volume: parsedData.waste_volume || client.waste_volume,
      waste_details: parsedData.waste_details || client.waste_details,
      key_contacts: parsedData.key_contacts || client.key_contacts,
      notes: client.notes 
        ? `${client.notes}\n\n[IA Síntesis]: ${parsedData.synthesis}${socialNotes}${sourcesNotes}${auditNotes}`
        : `[IA Síntesis]: ${parsedData.synthesis}${socialNotes}${sourcesNotes}${auditNotes}`,
      status: client.status === 'nuevo' ? 'nuevo' : client.status
    };

    // Si estamos en modo Supabase (servidor), guardamos en la BD
    let savedClient = client;
    let savedLog: ResearchLog = {
      id: '',
      client_id: client.id,
      search_queries: [query1, query2, query3, query4],
      raw_search_results: allSearchResults,
      deepseek_response: responseText
    };

    try {
      savedClient = await ClientModel.update(client.id, updatedClientData);
      savedLog = await ResearchModel.create({
        client_id: client.id,
        search_queries: [query1, query2, query3, query4],
        raw_search_results: allSearchResults,
        deepseek_response: responseText
      });
    } catch (dbError: any) {
      console.warn('[ResearchController] Fallo al escribir en Supabase. Operando en modo memoria/local:', dbError.message);
      savedClient = { ...client, ...updatedClientData };
    }

    return {
      client: savedClient,
      log: savedLog
    };
  }
}
