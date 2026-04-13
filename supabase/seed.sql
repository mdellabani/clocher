-- ================================================
-- SEED DATA: Saint-Médard (64) demo
-- ================================================

-- EPCI
INSERT INTO epci (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CC Lacq-Orthez');

-- Communes
INSERT INTO communes (
  id, epci_id, name, slug, code_postal, invite_code, theme, motto, description,
  infos_pratiques
) VALUES
(
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Saint-Médard',
  'saint-medard-64',
  '64370',
  'stmed1',
  'terre_doc',
  'Entre mer et montagne, au cœur du Béarn',
  'Saint-Médard est un village de 215 habitants perché sur une ligne de crête dominant la vallée du Luy, entre Béarn et Chalosse. La commune s''étend sur 11,26 km² entre 84 et 224 mètres d''altitude, à la frontière des Landes. Riche d''un patrimoine historique remarquable — camp romain, château du Comte d''Abidon, église gothique du XIVe siècle — le village offre un cadre de vie paisible entre traditions vivantes et nature préservée.',
  '{
    "horaires": "Lundi et jeudi\n8h00 – 12h00 / 12h30 – 17h30",
    "contact": "Tél : 05 59 67 56 14\nEmail : contact@saintmedard64.fr\nAdresse : Mairie, 64370 Saint-Médard",
    "services": "Crèche intercommunale (Sault de Navailles) : 05 59 67 90 12\nÉcole primaire Le Hêtre Blanc (Hagetaubin) : 05 59 67 52 04\nCollège Corisande d''Andoins (Arthez-de-Béarn) : 05 59 67 70 74\nLycée Gaston Fébus (Orthez) : 05 59 67 08 00\nTransport à la demande Mobilacq : 0 970 870 870 (2€/trajet)\nGare SNCF Orthez : 3635",
    "associations": "CCAS — Actions sociales, repas des aînés, sorties\nComité des Fêtes — Animations et rassemblements (cdfsaintmedard@gmail.com)\nLes Hippos''Amuz — Supporters du RCSM, sorties rugby\nSaint-Médard Loisirs — Ateliers créatifs, lecture, pétanque, jeux de cartes (06 41 05 06 70)\nRCSM — Rugby Club Saint-Médard",
    "liens": "CC Lacq-Orthez : https://www.cc-lacqorthez.fr\nTransports 64 : https://www.transport64.fr\nDéchèteries CCLO : 05 59 60 95 42"
  }'::jsonb
),
(
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Arthez-de-Béarn',
  'arthez-de-bearn',
  '64370',
  'arthz1',
  'alpin',
  'Village étape sur le chemin de Compostelle',
  'Arthez-de-Béarn est une bastide de 1 800 habitants sur le chemin de Saint-Jacques-de-Compostelle. Chef-lieu de canton, la commune abrite un patrimoine médiéval remarquable et offre un panorama exceptionnel sur la chaîne des Pyrénées.',
  '{
    "horaires": "Du lundi au vendredi\n8h30 – 12h00 / 14h00 – 17h00",
    "contact": "Tél : 05 59 67 70 11\nEmail : mairie@arthez-de-bearn.fr"
  }'::jsonb
);

-- ================================================
-- Demo users
-- ================================================

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
(
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000000',
  'secretaire@saintmedard64.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000000',
  'pierre.m@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000000',
  'jeanne.l@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated'
);

-- Profiles
INSERT INTO profiles (id, commune_id, display_name, role, status) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'Secrétariat Mairie', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Pierre Moreau', 'resident', 'active'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'Jeanne Larrieu', 'resident', 'active');

-- ================================================
-- POSTS
-- ================================================

-- Annonce: Mairie fermée
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Mairie fermée au public — Travaux budget',
  'La mairie sera fermée au public le lundi 14 et le jeudi 17 avril en raison des travaux de préparation du budget communal.

Pour toute urgence, vous pouvez joindre le secrétariat par téléphone au 05 59 67 56 14 ou par email à contact@saintmedard64.fr.

Nous vous remercions de votre compréhension.',
  true,
  now() - interval '2 hours'
);

-- Annonce: Collecte déchets 1er mai
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001002',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Collecte des déchets — 1er mai',
  'En raison du jour férié du 1er mai, la collecte des ordures ménagères prévue le jeudi 1er mai est reportée au vendredi 2 mai.

Merci de sortir vos bacs la veille au soir.

Pour rappel : bac vert (ordures ménagères) le jeudi, bac jaune (recyclables) un mardi sur deux. En cas de doute, contactez le service environnement CCLO au 05 59 60 95 42.',
  false,
  now() - interval '3 days'
);

-- Annonce: Travaux chemin communal
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001003',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Travaux chemin du lavoir — Circulation modifiée',
  'Des travaux de réfection du chemin communal reliant le lavoir à la mairie débuteront le lundi 21 avril pour une durée estimée de 2 semaines.

La circulation sera déviée par le chemin de la crête. Un plan de déviation sera affiché en mairie et aux entrées du chemin.

Merci de votre patience. Ces travaux amélioreront considérablement l''état de cette voie très empruntée par les promeneurs.',
  false,
  now() - interval '1 day'
);

-- Événement: Voyage Paris croisière
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001004',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Voyage "Paris croisière" — Génération Mouvements 64',
  'L''association Génération Mouvements 64 organise un voyage à Paris incluant une croisière sur la Seine et la visite de Montmartre.

Dates : du 15 au 18 juin 2026
Tarif : 380€ par personne (transport, hébergement, visites inclus)
Inscriptions avant le 15 mai auprès du CCAS ou en mairie.

Ouvert à tous les habitants de la commune et des communes voisines.',
  '2026-06-15T08:00:00Z',
  'Départ parking mairie — Paris',
  now() - interval '4 days'
);

-- Événement: Repas des aînés
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001005',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Repas des aînés du CCAS',
  'Le CCAS de Saint-Médard vous invite au traditionnel repas des aînés.

Un moment de convivialité autour d''un bon repas préparé par un traiteur local. Animation musicale l''après-midi.

Inscription obligatoire avant le 20 avril auprès du secrétariat de mairie.',
  '2026-04-27T12:00:00Z',
  'Salle des fêtes de Saint-Médard',
  now() - interval '5 days'
);

-- Événement: Tournoi rugby RCSM
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001006',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Tournoi de printemps du RCSM',
  'Le Rugby Club Saint-Médard organise son tournoi de printemps annuel !

Au programme :
- 9h00 : Tournoi jeunes (catégories M8 à M14)
- 14h00 : Matchs seniors
- 18h00 : Remise des trophées
- 19h00 : Repas au club (réservation obligatoire)

Buvette et restauration sur place toute la journée. Venez nombreux soutenir nos équipes !',
  '2026-05-10T09:00:00Z',
  'Stade du Moulin, Saint-Médard',
  now() - interval '2 days'
);

-- Entraide: Débroussaillage
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001007',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000101',
  'entraide',
  'Cherche coup de main pour débroussaillage',
  'Bonjour à tous,

J''ai un terrain d''environ 500m² à débroussailler avant l''été (derrière le chemin de la crête). J''ai le matériel mais c''est un gros travail seul.

Si quelqu''un est disponible samedi matin, je serais reconnaissant ! Je peux rendre la pareille pour des travaux ou du bricolage.

On pourra faire un casse-croûte ensemble à midi.',
  now() - interval '1 day'
);

-- Entraide: Covoiturage Orthez
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001008',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000102',
  'entraide',
  'Covoiturage Orthez le mercredi — Places disponibles',
  'Bonjour,

Je descends à Orthez tous les mercredis matin (départ 8h30 du parking de la mairie, retour vers 12h30). J''ai 3 places disponibles dans la voiture.

C''est gratuit, juste du bon sens entre voisins ! Si ça intéresse quelqu''un, répondez ici ou venez directement mercredi matin.',
  now() - interval '6 hours'
);

-- Discussion: Chemin communal
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000102',
  'discussion',
  'Des nouvelles du chemin communal vers le lavoir ?',
  'Quelqu''un sait si les travaux du chemin entre le lavoir et la mairie vont reprendre bientôt ? Ça fait des mois que c''est en plan et c''est devenu vraiment impraticable quand il pleut.

Les enfants l''empruntent pour aller au car scolaire et c''est dangereux avec toute cette boue.',
  now() - interval '4 days'
);

-- Discussion: O'Médard horaires
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001010',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000101',
  'discussion',
  'Horaires d''ouverture du café O''Médard ?',
  'Bonjour, est-ce que quelqu''un connaît les horaires actuels du O''Médard ? J''ai essayé d''y passer vendredi après-midi mais c''était fermé.

Merci !',
  now() - interval '2 days'
);

-- ================================================
-- COMMENTS
-- ================================================

INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000101', 'Je me posais la même question. La dernière fois que j''ai croisé le maire, il m''a dit que le budget était voté et que ça devrait commencer courant avril.', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000100', 'Bonjour, les travaux sont effectivement programmés à partir du 21 avril. Un avis sera publié prochainement. Merci de votre patience.', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000102', 'Super merci pour l''info ! Ce sera beaucoup plus sûr pour les enfants.', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000102', 'Je peux venir samedi matin, je suis libre jusqu''à 13h. Je ramène ma débroussailleuse aussi !', now() - interval '12 hours'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000101', 'Parfait Jeanne, merci ! Rendez-vous à 9h chez moi (maison au bout du chemin de la crête, portail vert). Le café sera prêt !', now() - interval '10 hours'),
  ('00000000-0000-0000-0000-000000001010', '00000000-0000-0000-0000-000000000102', 'Normalement c''est ouvert le vendredi et samedi soir, et le dimanche matin. Mais ça change parfois, le mieux c''est d''appeler avant.', now() - interval '1 day');

-- ================================================
-- RSVPs
-- ================================================

INSERT INTO rsvps (post_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000101', 'going'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000102', 'going'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000101', 'going'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000102', 'maybe'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000102', 'going');
