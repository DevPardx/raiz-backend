import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedProperties1735075200000 implements MigrationInterface {
  name = "SeedProperties1735075200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userCheck = await queryRunner.query("SELECT id FROM users LIMIT 1");

    let userId: string;
    if (userCheck.length === 0) {
      const result = await queryRunner.query(`
        INSERT INTO users (email, password, name, role)
        VALUES ('demo@raiz.com', '$2b$10$X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5', 'Demo Seller', 'seller')
        RETURNING id
      `);
      userId = result[0].id;
    } else {
      userId = userCheck[0].id;
    }

    const properties = [
      {
        title: "Casa de Playa El Tunco",
        description: "Hermosa casa frente al mar en El Tunco, playa mundialmente conocida por sus olas perfectas para surf. Terraza con vista al océano, piscina privada y acceso directo a la playa. Ideal para alquiler turístico o residencia vacacional.",
        price: 350000,
        propertyType: "house",
        address: "Playa El Tunco, Calle Principal #45",
        department: "La Libertad",
        municipality: "Tamanique",
        latitude: 13.4925,
        longitude: -89.3642,
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 320.50,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Apartamento de Lujo Escalón",
        description: "Espectacular apartamento en la Colonia Escalón, zona exclusiva de San Salvador. Edificio con portería 24/7, gimnasio, piscina infinity, salón de eventos y helipuerto. Vista panorámica a la ciudad.",
        price: 285000,
        propertyType: "apartment",
        address: "Paseo General Escalón #3456, Colonia Escalón",
        department: "San Salvador",
        municipality: "San Salvador",
        latitude: 13.7025,
        longitude: -89.2350,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 145.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Lote Comercial Carretera Panamericana",
        description: "Lote comercial estratégicamente ubicado sobre la Carretera Panamericana con alta visibilidad. Ideal para gasolinera, restaurante o centro comercial. Todos los servicios disponibles.",
        price: 450000,
        propertyType: "land",
        address: "Carretera Panamericana Km 42, desvío La Libertad",
        department: "La Libertad",
        municipality: "Santa Tecla",
        latitude: 13.6770,
        longitude: -89.2795,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 2500.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Local Comercial Centro Histórico San Salvador",
        description: "Local comercial en pleno Centro Histórico de San Salvador, a pasos del Palacio Nacional y la Catedral Metropolitana. Perfecto para boutique, galería de arte o restaurante. Alto flujo peatonal.",
        price: 180000,
        propertyType: "commercial",
        address: "Avenida Cuscatlán #245, Centro Histórico",
        department: "San Salvador",
        municipality: "San Salvador",
        latitude: 13.6929,
        longitude: -89.2182,
        bedrooms: 2,
        bathrooms: 2,
        areaSqm: 180.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Bodega Industrial Zona Franca San Marcos",
        description: "Amplia bodega industrial en Zona Franca con muelles de carga, altura libre de 8 metros y fácil acceso al Puerto de La Libertad. Perfecta para importación, distribución y logística.",
        price: 420000,
        propertyType: "warehouse",
        address: "Boulevard del Ejército, Zona Franca",
        department: "San Salvador",
        municipality: "San Marcos",
        latitude: 13.6586,
        longitude: -89.1849,
        bedrooms: 5,
        bathrooms: 4,
        areaSqm: 1200.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Casa de Playa El Sunzal",
        description: "Casa frente al mar en Playa El Sunzal, famosa playa de surf. Acceso directo a la playa, terraza con vista al Pacífico, rancho con BBQ y jardín tropical. Perfecta para vacaciones o inversión turística.",
        price: 295000,
        propertyType: "house",
        address: "Playa El Sunzal, Calle al Mar #12",
        department: "La Libertad",
        municipality: "La Libertad",
        latitude: 13.5092,
        longitude: -89.4253,
        bedrooms: 5,
        bathrooms: 4,
        areaSqm: 280.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Apartamento Universitario Santa Tecla",
        description: "Moderno apartaestudio en zona universitaria cerca de la UCA. Completamente amoblado, con cocina integral, excelente iluminación natural y seguridad 24/7. Ideal para estudiantes o profesionales.",
        price: 65000,
        propertyType: "apartment",
        address: "Colonia San José, Calle Los Bambúes #234",
        department: "La Libertad",
        municipality: "Santa Tecla",
        latitude: 13.6772,
        longitude: -89.2897,
        bedrooms: 1,
        bathrooms: 1,
        areaSqm: 42.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Finca Cafetalera Apaneca",
        description: "Hermosa finca cafetalera productiva con 15 hectáreas cultivadas en la Ruta de las Flores. Incluye casa patronal colonial, beneficio húmedo y vivienda para trabajadores. Café de altura certificado.",
        price: 580000,
        propertyType: "land",
        address: "Cantón El Refugio, Carretera a Apaneca Km 8",
        department: "Ahuachapán",
        municipality: "Apaneca",
        latitude: 13.8519,
        longitude: -89.8053,
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 150000.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Oficina Corporativa World Trade Center",
        description: "Moderna oficina en el World Trade Center San Salvador. Edificio inteligente clase A, pisos en porcelanato, iluminación LED, aire acondicionado centralizado y sistema contra incendios. Incluye 5 parqueaderos.",
        price: 195000,
        propertyType: "commercial",
        address: "Torre 1, Piso 12, World Trade Center",
        department: "San Salvador",
        municipality: "San Salvador",
        latitude: 13.6889,
        longitude: -89.2393,
        bedrooms: 2,
        bathrooms: 2,
        areaSqm: 220.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Penthouse Zona Rosa",
        description: "Espectacular penthouse en plena Zona Rosa con terraza de 180m² y vista panorámica a San Salvador. Acabados de lujo importados, cocina italiana, domótica, jacuzzi y ascensor privado. Ultra exclusivo.",
        price: 850000,
        propertyType: "apartment",
        address: "Boulevard del Hipódromo #789, Zona Rosa",
        department: "San Salvador",
        municipality: "San Salvador",
        latitude: 13.7043,
        longitude: -89.2289,
        bedrooms: 4,
        bathrooms: 5,
        areaSqm: 450.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Casa en Residencial Lomas de San Francisco",
        description: "Hermosa casa en exclusivo residencial cerrado en Antiguo Cuscatlán. Piscina comunitaria, áreas verdes, cancha de tenis, casa club y seguridad 24/7. Excelente ubicación cerca de centros comerciales y colegios.",
        price: 225000,
        propertyType: "house",
        address: "Residencial Lomas de San Francisco, Casa 45",
        department: "La Libertad",
        municipality: "Antiguo Cuscatlán",
        latitude: 13.6839,
        longitude: -89.2536,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 185.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Lote Urbano Santa Ana",
        description: "Lote urbano en zona de expansión con todos los servicios públicos. Ideal para proyecto de vivienda multifamiliar o plaza comercial. Segunda ciudad más importante del país, alta valorización.",
        price: 280000,
        propertyType: "land",
        address: "Avenida Independencia Sur #56, Colonia Santa Lucía",
        department: "Santa Ana",
        municipality: "Santa Ana",
        latitude: 13.9942,
        longitude: -89.5597,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 850.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Local Comercial Multiplaza",
        description: "Local comercial en Multiplaza, el centro comercial más exclusivo de El Salvador. Alto flujo peatonal de clientes con alto poder adquisitivo. Actualmente arrendado, excelente rentabilidad.",
        price: 350000,
        propertyType: "commercial",
        address: "Multiplaza, Local 145, Nivel 2",
        department: "La Libertad",
        municipality: "Santa Tecla",
        latitude: 13.6773,
        longitude: -89.2895,
        bedrooms: 2,
        bathrooms: 1,
        areaSqm: 65.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Bodega de Distribución Soyapango",
        description: "Bodega industrial con rampa de descargue, oficinas administrativas completas y baños para personal. Zona industrial con fácil acceso a Carretera Panamericana y Boulevard del Ejército.",
        price: 285000,
        propertyType: "warehouse",
        address: "Boulevard del Ejército #1200, Zona Industrial",
        department: "San Salvador",
        municipality: "Soyapango",
        latitude: 13.7095,
        longitude: -89.1421,
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 650.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Casa Colonial Suchitoto",
        description: "Hermosa casa colonial restaurada en el pueblo mágico de Suchitoto. Arquitectura tradicional con patio central andaluz, fuente de agua, jardines coloniales y vista al Lago Suchitlán. Perfecta para turismo.",
        price: 195000,
        propertyType: "house",
        address: "Calle Francisco Morazán #15, Centro Histórico",
        department: "Cuscatlán",
        municipality: "Suchitoto",
        latitude: 13.9386,
        longitude: -89.0275,
        bedrooms: 5,
        bathrooms: 4,
        areaSqm: 380.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Apartamento Torre Futura",
        description: "Apartamento remodelado en Torre Futura, Colonia Escalón. Edificio clásico con portería, gimnasio y piscina. Cerca de restaurantes, supermercados y Paseo El Carmen. Excelente ubicación.",
        price: 165000,
        propertyType: "apartment",
        address: "Torre Futura, Apartamento 804",
        department: "San Salvador",
        municipality: "San Salvador",
        latitude: 13.7015,
        longitude: -89.2328,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 95.00,
        status: "paused",
        isFeatured: false,
      },
      {
        title: "Terreno Agrícola San Miguel",
        description: "Amplio terreno agrícola en la zona oriental del país. Ideal para cultivo de granos básicos, ganadería o proyecto agroindustrial. Acceso a agua y electricidad. Excelente clima.",
        price: 120000,
        propertyType: "land",
        address: "Cantón El Jícaro, Carretera Panamericana Km 145",
        department: "San Miguel",
        municipality: "San Miguel",
        latitude: 13.4833,
        longitude: -88.1833,
        bedrooms: 4,
        bathrooms: 2,
        areaSqm: 50000.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Restaurante Equipado Paseo El Carmen",
        description: "Restaurante completamente equipado en el exclusivo Paseo El Carmen. Cocina industrial de acero inoxidable, mobiliario incluido, terraza cubierta y licores vigentes. Negocio establecido con clientela fiel.",
        price: 275000,
        propertyType: "commercial",
        address: "Paseo El Carmen #45, Local 12",
        department: "La Libertad",
        municipality: "Santa Tecla",
        latitude: 13.6776,
        longitude: -89.2821,
        bedrooms: 5,
        bathrooms: 3,
        areaSqm: 280.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Casa en Condado del Rey",
        description: "Hermosa casa en residencial Condado del Rey, Nuevo Cuscatlán. Conjunto cerrado familiar con zonas verdes, parque infantil, cancha de fútbol, piscina y portería 24/7. Cerca a colegios y supermercados.",
        price: 185000,
        propertyType: "house",
        address: "Residencial Condado del Rey, Casa 78",
        department: "La Libertad",
        municipality: "Nuevo Cuscatlán",
        latitude: 13.6567,
        longitude: -89.2761,
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 165.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Loft Moderno San Benito",
        description: "Moderno loft estilo industrial en pleno San Benito con doble altura y mezanine. Cocina abierta con barra americana, acabados en concreto pulido y vidrio. Perfecto para profesionales jóvenes.",
        price: 175000,
        propertyType: "apartment",
        address: "Colonia San Benito, Calle La Reforma #456",
        department: "San Salvador",
        municipality: "San Salvador",
        latitude: 13.6978,
        longitude: -89.2445,
        bedrooms: 2,
        bathrooms: 2,
        areaSqm: 105.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Mega Bodega Logística Ilopango",
        description: "Moderna bodega clase A en zona franca de Ilopango. Altura de 12 metros, piso industrial reforzado, 10 muelles de carga y rampa. Sistema contra incendios, planta eléctrica y fácil acceso al aeropuerto.",
        price: 950000,
        propertyType: "warehouse",
        address: "Zona Franca Internacional, Bodega 5",
        department: "San Salvador",
        municipality: "Ilopango",
        latitude: 13.7019,
        longitude: -89.1094,
        bedrooms: 9,
        bathrooms: 6,
        areaSqm: 5000.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Casa Campestre Atiquizaya",
        description: "Encantadora casa campestre en la Ruta de las Flores rodeada de cafetales y bosques. Vista espectacular, clima fresco, jacuzzi exterior, rancho para eventos y huerta orgánica. Paz y naturaleza.",
        price: 165000,
        propertyType: "house",
        address: "Cantón Las Pilas, Km 5 Carretera a Apaneca",
        department: "Ahuachapán",
        municipality: "Atiquizaya",
        latitude: 13.9758,
        longitude: -89.7525,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 210.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Apartamento Frente al Mar Costa del Sol",
        description: "Apartamento frente al mar en exclusivo condominio Costa del Sol. Vista panorámica al océano Pacífico, edificio con piscina infinity, jacuzzi, gimnasio y acceso directo a la playa. Ideal para inversión turística.",
        price: 385000,
        propertyType: "apartment",
        address: "Residencial Las Gaviotas, Torre B #502",
        department: "La Paz",
        municipality: "San Luis La Herradura",
        latitude: 13.4644,
        longitude: -89.0517,
        bedrooms: 3,
        bathrooms: 3,
        areaSqm: 165.00,
        status: "active",
        isFeatured: true,
      },
      {
        title: "Lote Comercial Carretera a Comalapa",
        description: "Lote comercial sobre vía principal a 5 km del Aeropuerto Internacional. Ideal para hotel, centro de distribución o proyecto de uso mixto. Alta visibilidad y todos los servicios.",
        price: 420000,
        propertyType: "land",
        address: "Carretera al Aeropuerto Km 38.5",
        department: "La Paz",
        municipality: "San Luis Talpa",
        latitude: 13.5628,
        longitude: -89.0906,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 4200.00,
        status: "active",
        isFeatured: false,
      },
      {
        title: "Casa Moderna Residencial Los Sauces",
        description: "Casa de diseño contemporáneo minimalista con domótica, paneles solares, sistema de recolección de agua lluvia y jardín vertical. Acabados de primera en residencial exclusivo en Nuevo Cuscatlán.",
        price: 475000,
        propertyType: "house",
        address: "Residencial Los Sauces, Casa 23",
        department: "La Libertad",
        municipality: "Nuevo Cuscatlán",
        latitude: 13.6592,
        longitude: -89.2845,
        bedrooms: 4,
        bathrooms: 4,
        areaSqm: 295.00,
        status: "sold",
        isFeatured: false,
      },
    ];

    const propertyIds: string[] = [];

    for (const property of properties) {
      const result = await queryRunner.query(`
        INSERT INTO properties (
          user_id, title, description, price, property_type, address,
          department, municipality, latitude, longitude, bedrooms, bathrooms,
          area_sqm, status, is_featured
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `, [
        userId,
        property.title,
        property.description,
        property.price,
        property.propertyType,
        property.address,
        property.department,
        property.municipality,
        property.latitude,
        property.longitude,
        property.bedrooms,
        property.bathrooms,
        property.areaSqm,
        property.status,
        property.isFeatured,
      ]);

      propertyIds.push(result[0].id);
    }

    const imageTemplates = [
      {
        type: "house",
        images: [
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
          "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
          "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
          "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
        ]
      },
      {
        type: "apartment",
        images: [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
          "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800",
          "https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=800",
        ]
      },
      {
        type: "land",
        images: [
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
          "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800",
        ]
      },
      {
        type: "commercial",
        images: [
          "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800",
          "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800",
          "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800",
        ]
      },
      {
        type: "warehouse",
        images: [
          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
          "https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800",
          "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800",
        ]
      }
    ];

    for (let i = 0; i < propertyIds.length; i++) {
      const property = properties[i];
      const propertyId = propertyIds[i];
      const imageSet = imageTemplates.find(t => t.type === property!.propertyType);

      if (imageSet) {
        const numImages = Math.min(imageSet.images.length, 3 + Math.floor(Math.random() * 3));

        for (let j = 0; j < numImages; j++) {
          const imageUrl = imageSet.images[j % imageSet.images.length];
          await queryRunner.query(`
            INSERT INTO property_images (property_id, url, cloudinary_id, display_order)
            VALUES ($1, $2, $3, $4)
          `, [
            propertyId,
            imageUrl,
            `seed_${propertyId}_${j}`,
            j,
          ]);
        }
      }
    }

    console.log(`Seeded ${properties.length} properties with images successfully!`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM properties
      WHERE title IN (
        'Casa de Playa El Tunco',
        'Apartamento de Lujo Escalón',
        'Lote Comercial Carretera Panamericana',
        'Local Comercial Centro Histórico San Salvador',
        'Bodega Industrial Zona Franca San Marcos',
        'Casa de Playa El Sunzal',
        'Apartamento Universitario Santa Tecla',
        'Finca Cafetalera Apaneca',
        'Oficina Corporativa World Trade Center',
        'Penthouse Zona Rosa',
        'Casa en Residencial Lomas de San Francisco',
        'Lote Urbano Santa Ana',
        'Local Comercial Multiplaza',
        'Bodega de Distribución Soyapango',
        'Casa Colonial Suchitoto',
        'Apartamento Torre Futura',
        'Terreno Agrícola San Miguel',
        'Restaurante Equipado Paseo El Carmen',
        'Casa en Condado del Rey',
        'Loft Moderno San Benito',
        'Mega Bodega Logística Ilopango',
        'Casa Campestre Atiquizaya',
        'Apartamento Frente al Mar Costa del Sol',
        'Lote Comercial Carretera a Comalapa',
        'Casa Moderna Residencial Los Sauces'
      )
    `);

    await queryRunner.query(`
      DELETE FROM users WHERE email = 'demo@raiz.com'
    `);

    console.log("Seed data removed successfully!");
  }
}
