-- ============================================================================
-- PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
-- PRODUCTION SEED DATA: All 4 Regions (Puducherry, Karaikal, Mahe, Yanam)
-- Realistic Coordinate Polygons & Electrical Network Topologies
-- ============================================================================

-- 1. Regions
INSERT INTO public.regions (id, code, name, headquarters) VALUES
('11000000-0000-0000-0000-000000000001', 'REG-PDY', 'Puducherry', 'Gubert Avenue, Puducherry'),
('11000000-0000-0000-0000-000000000002', 'REG-KKL', 'Karaikal', 'Beach Road, Karaikal'),
('11000000-0000-0000-0000-000000000003', 'REG-MAH', 'Mahe', 'Civil Station Road, Mahe'),
('11000000-0000-0000-0000-000000000004', 'REG-YAN', 'Yanam', 'Pillaraya Street, Yanam')
ON CONFLICT (code) DO NOTHING;

-- 2. Divisions
INSERT INTO public.divisions (id, region_id, code, name, ee_in_charge_name, contact_phone) VALUES
('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'DIV-URBAN', 'Urban Distribution Division', 'Er. M. Sivakumar, EE', '+91 94430 11001'),
('12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'DIV-RURAL-N', 'Rural North Division', 'Er. R. Baskaran, EE', '+91 94430 11002'),
('12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'DIV-KKL', 'Karaikal Electricity Division', 'Er. K. Murugesan, EE', '+91 94430 11003'),
('12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000003', 'DIV-MAHE-YAN', 'Outlying Regions Division', 'Er. V. Radhakrishnan, EE', '+91 94430 11004')
ON CONFLICT (code) DO NOTHING;

-- 3. Subdivisions
INSERT INTO public.subdivisions (id, division_id, code, name, aee_in_charge_name) VALUES
('13000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'SUBDIV-TOWN', 'Town Sub-Division', 'Er. S. Jayakumar, AEE'),
('13000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'SUBDIV-BLVD', 'Boulevard Sub-Division', 'Er. P. Thirunavukkarasu, AEE'),
('13000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', 'SUBDIV-KKL-TOWN', 'Karaikal Town Sub-Division', 'Er. N. Ravichandran, AEE'),
('13000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', 'SUBDIV-MAHE', 'Mahe O&M Sub-Division', 'Er. K. Mukundan, AEE')
ON CONFLICT (code) DO NOTHING;

-- 4. O&M Sections
INSERT INTO public.om_sections (id, subdivision_id, code, name, ae_in_charge_name, office_address, office_location) VALUES
('14000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'SEC-MARAPALAM', 'Marapalam O&M Section', 'Er. T. Senthil Nathan, AE', 'Maraimalai Adigal Salai, Marapalam', ST_SetSRID(ST_Point(79.8183, 11.9216), 4326)),
('14000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'SEC-HERITAGE', 'Heritage French Quarter Section', 'Er. G. Ilangovan, AE', 'Rue Romain Rolland, White Town', ST_SetSRID(ST_Point(79.8340, 11.9360), 4326)),
('14000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001', 'SEC-LAWSPET', 'Lawspet O&M Section', 'Er. D. Raman, AE', 'Airport Road, Lawspet', ST_SetSRID(ST_Point(79.8124, 11.9682), 4326)),
('14000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000003', 'SEC-KKL-PORT', 'Karaikal Port O&M Section', 'Er. M. Anbarasan, AE', 'Keezha Kasakudy, Karaikal', ST_SetSRID(ST_Point(79.8390, 10.9250), 4326))
ON CONFLICT (code) DO NOTHING;

-- 5. JE Jurisdictions
INSERT INTO public.je_jurisdictions (id, section_id, code, name, je_name) VALUES
('15000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'JE-JUR-MARA-01', 'Marapalam Commercial Ward', 'Er. V. Anand, JE'),
('15000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000001', 'JE-JUR-MARA-02', 'Orleanpet Residential Ward', 'Er. K. Prakash, JE'),
('15000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000002', 'JE-JUR-HERI-01', 'White Town & Beach Road', 'Er. P. Dinesh, JE')
ON CONFLICT (code) DO NOTHING;

-- 6. User Profiles (16 Key Personas covering all roles & SE hierarchy)
INSERT INTO public.user_profiles (
    id, username, email, full_name, role, designation, phone, region_id, division_id, subdivision_id, section_id, je_jurisdiction_id
) VALUES
('20000000-0000-0000-0000-000000000001', 'superadmin', 'superadmin@electricity.py.gov.in', 'System Administrator', 'super_admin', 'Director of IT & Geospatial Systems', '+91 413 2336331', NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000002', 'se_puducherry_1', 'se1.pdy@electricity.py.gov.in', 'Er. T. Chandrasekaran', 'se', 'Superintending Engineer (Circle I - Urban)', '+91 94430 00001', '11000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000003', 'se_puducherry_2', 'se2.pdy@electricity.py.gov.in', 'Er. A. Rajagopalan', 'se', 'Superintending Engineer (Circle II - Rural)', '+91 94430 00002', '11000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000004', 'se_karaikal', 'se.kkl@electricity.py.gov.in', 'Er. M. Balasubramanian', 'se', 'Superintending Engineer (Karaikal, Mahe & Yanam)', '+91 94430 00003', '11000000-0000-0000-0000-000000000002', NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000005', 'ee_urban', 'ee.urban@electricity.py.gov.in', 'Er. M. Sivakumar', 'ee', 'Executive Engineer (Urban Operations)', '+91 94430 11001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000006', 'aee_town', 'aee.town@electricity.py.gov.in', 'Er. S. Jayakumar', 'aee', 'Assistant Executive Engineer (Town Sub-Division)', '+91 94430 11005', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', NULL, NULL),
('20000000-0000-0000-0000-000000000007', 'ae_marapalam', 'ae.marapalam@electricity.py.gov.in', 'Er. T. Senthil Nathan', 'ae', 'Assistant Engineer (Marapalam Section)', '+91 94430 11007', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', NULL),
('20000000-0000-0000-0000-000000000008', 'je_marapalam', 'je.marapalam@electricity.py.gov.in', 'Er. V. Anand', 'je', 'Junior Engineer (Marapalam Commercial Ward)', '+91 94430 11008', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000009', 'contractor_epc', 'survey.epc@larsenpower.com', 'Er. Rajesh Kumar', 'contractor', 'Authorized EPC Survey Contractor', '+91 98840 22001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000010', 'gis_administrator', 'gisadmin@electricity.py.gov.in', 'S. Ananthi', 'gis_admin', 'Principal Spatial Data Administrator', '+91 94430 11010', NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000011', 'grid_auditor', 'auditor@jercuts.gov.in', 'Dr. S. Ramachandran', 'auditor', 'JERC Regulatory Grid Auditor', '+91 94430 11015', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (username) DO NOTHING;

-- 7. Substations (Puducherry, Karaikal, Mahe, Yanam)
INSERT INTO public.substations (
    id, code, name, voltage_class, capacity_mva, num_feeders, region_id, division_id, section_id, commission_date, geom
) VALUES
('30000000-0000-0000-0000-000000000001', 'SS-MARA-110', 'Marapalam 110/22kV Substation', '110kV', 80.00, 6, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '2015-08-15', ST_SetSRID(ST_Point(79.8183, 11.9216), 4326)),
('30000000-0000-0000-0000-000000000002', 'SS-VILL-230', 'Villianur 230/110kV Auto Substation', '230kV', 200.00, 8, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', NULL, '2012-01-26', ST_SetSRID(ST_Point(79.7562, 11.9168), 4326)),
('30000000-0000-0000-0000-000000000003', 'SS-LAWS-066', 'Lawspet 66/11kV Substation', '66kV', 50.00, 4, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', '2018-05-10', ST_SetSRID(ST_Point(79.8124, 11.9682), 4326)),
('30000000-0000-0000-0000-000000000004', 'SS-MUTH-033', 'Muthialpet 33/11kV Substation', '33kV', 25.00, 4, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '2020-03-22', ST_SetSRID(ST_Point(79.8340, 11.9540), 4326)),
('30000000-0000-0000-0000-000000000005', 'SS-KKL-110', 'Karaikal Port 110/33kV Substation', '110kV', 60.00, 5, '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000004', '2016-10-18', ST_SetSRID(ST_Point(79.8385, 10.9230), 4326)),
('30000000-0000-0000-0000-000000000006', 'SS-MAHE-066', 'Mahe 66/11kV Substation', '66kV', 20.00, 3, '11000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000004', NULL, '2019-02-14', ST_SetSRID(ST_Point(75.5342, 11.7018), 4326)),
('30000000-0000-0000-0000-000000000007', 'SS-YAN-033', 'Yanam Godavari 33/11kV Substation', '33kV', 16.00, 3, '11000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', NULL, '2021-07-09', ST_SetSRID(ST_Point(82.2175, 16.7320), 4326))
ON CONFLICT (code) DO NOTHING;

-- 8. Feeders
INSERT INTO public.feeders (
    id, code, name, substation_id, voltage_class, conductor_type, length_km, peak_load_amps, region_id, division_id, section_id, is_energized, geom
) VALUES
('40000000-0000-0000-0000-000000000001', 'FDR-MARA-01', 'Marapalam - Boulevard 11kV Feeder', '30000000-0000-0000-0000-000000000001', '11kV', 'Rabbit ACSR', 4.80, 245.0, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8183 11.9216, 79.8210 11.9250, 79.8250 11.9310, 79.8290 11.9340, 79.8310 11.9370)'), 4326)),
('40000000-0000-0000-0000-000000000002', 'FDR-HERI-02', 'French Quarter Heritage 11kV Feeder', '30000000-0000-0000-0000-000000000001', '11kV', 'Dog ACSR', 3.60, 280.0, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8250 11.9310, 79.8280 11.9340, 79.8310 11.9380, 79.8340 11.9420)'), 4326)),
('40000000-0000-0000-0000-000000000003', 'FDR-LAWS-03', 'Lawspet - Airport Road 11kV Feeder', '30000000-0000-0000-0000-000000000003', '11kV', 'Rabbit ACSR', 5.20, 195.0, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8124 11.9682, 79.8140 11.9650, 79.8160 11.9600, 79.8200 11.9560)'), 4326)),
('40000000-0000-0000-0000-000000000004', 'FDR-KKL-01', 'Karaikal Harbor Express 33kV Feeder', '30000000-0000-0000-0000-000000000005', '33kV', 'Panther ACSR', 6.40, 210.0, '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000004', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8385 10.9230, 79.8410 10.9260, 79.8450 10.9300)'), 4326))
ON CONFLICT (code) DO NOTHING;

-- 9. Transformers (DTs)
INSERT INTO public.transformers (
    id, code, name, feeder_id, capacity_kva, make, serial_number, installation_date, load_percentage, oil_level_pct, has_oil_leakage, phase_imbalance_pct, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('50000000-0000-0000-0000-000000000001', 'DTR-BLVD-01', 'Boulevard North DTR 250kVA', '40000000-0000-0000-0000-000000000001', 250, 'Voltamp Transformers', 'VT-2022-8812', '2022-03-10', 68.5, 96.0, FALSE, 3.2, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8250, 11.9310), 4326)),
('50000000-0000-0000-0000-000000000002', 'DTR-HERI-02', 'French Quarter Heritage DTR 500kVA', '40000000-0000-0000-0000-000000000002', 500, 'ABB India Ltd', 'ABB-2021-9943', '2021-11-20', 82.0, 92.5, FALSE, 7.8, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8310, 11.9380), 4326)),
('50000000-0000-0000-0000-000000000003', 'DTR-ARPT-03', 'Airport Gateway DTR 160kVA', '40000000-0000-0000-0000-000000000003', 160, 'Kirloskar Electric', 'KEC-2023-1102', '2023-01-15', 45.2, 98.0, FALSE, 2.5, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', NULL, ST_SetSRID(ST_Point(79.8160, 11.9600), 4326)),
('50000000-0000-0000-0000-000000000004', 'DTR-KKL-04', 'Karaikal Harbor DTR 400kVA', '40000000-0000-0000-0000-000000000004', 400, 'Schneider Electric', 'SCH-2020-4491', '2020-06-18', 76.4, 94.0, FALSE, 4.1, '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000004', NULL, ST_SetSRID(ST_Point(79.8420, 10.9270), 4326))
ON CONFLICT (code) DO NOTHING;

-- 10. Poles
INSERT INTO public.poles (
    id, code, pole_number, pole_type, material, height_meters, feeder_id, transformer_id, has_streetlight, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('60000000-0000-0000-0000-000000000001', 'POL-MARA-001', 'P-01/MARA', 'PSCC 9m', 'Pre-stressed Concrete', 9.0, '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', TRUE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8210, 11.9250), 4326)),
('60000000-0000-0000-0000-000000000002', 'POL-MARA-002', 'P-02/MARA', 'PSCC 9m', 'Pre-stressed Concrete', 9.0, '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', TRUE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8230, 11.9280), 4326)),
('60000000-0000-0000-0000-000000000003', 'POL-HERI-010', 'P-10/HERI', 'Steel Tubular 11m', 'Galvanized Steel', 11.0, '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', TRUE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8290, 11.9350), 4326)),
('60000000-0000-0000-0000-000000000004', 'POL-HERI-011', 'P-11/HERI', 'Steel Tubular 11m', 'Galvanized Steel', 11.0, '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', FALSE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8315, 11.9385), 4326))
ON CONFLICT (code) DO NOTHING;

-- 11. Consumers & Smart Meters
INSERT INTO public.consumers (
    id, consumer_number, account_number, name, address, category, sanctioned_load_kw, pole_id, transformer_id, feeder_id, meter_number, is_smart_meter, meter_make, meter_install_date, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('70000000-0000-0000-0000-000000000001', 'CON-04-102-9901', 'ACC-PDY-101', 'Alliance Francaise de Pondichery', '58 Suffren Street, White Town, Puducherry', 'Commercial', 35.0, '60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'SMTR-LT-44910', TRUE, 'L&T Smart Grid', '2023-04-12', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8320, 11.9390), 4326)),
('70000000-0000-0000-0000-000000000002', 'CON-04-102-9902', 'ACC-PDY-102', 'Aurobindo Ashram Guest House', 'Marine Street, White Town', 'Domestic', 15.0, '60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'SMTR-LT-44911', TRUE, 'L&T Smart Grid', '2023-04-14', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8340, 11.9430), 4326)),
('70000000-0000-0000-0000-000000000003', 'CON-04-102-9903', 'ACC-PDY-103', 'Pondicherry Central Bus Stand Complex', 'Maraimalai Adigal Salai, Marapalam', 'Commercial', 65.0, '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'CONV-GEN-1020', FALSE, 'Genus Power', '2019-08-25', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8220, 11.9270), 4326))
ON CONFLICT (consumer_number) DO NOTHING;

-- 12. Faults & Distance Measurements
INSERT INTO public.faults (
    id, fault_code, category, description, priority, status, feeder_id, transformer_id, pole_id, section_id, je_jurisdiction_id, reported_by, assigned_to, distance_from_pole_m, distance_from_dt_m, distance_along_feeder_m, distance_from_office_km, affected_consumers_est, geom
) VALUES
('80000000-0000-0000-0000-000000000001', 'FLT-2026-0001', 'Conductor Snapped', '11kV Conductor snapped across Maraimalai Adigal Salai due to storm tree fall', 'critical', 'in_progress', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009', 14.5, 120.0, 1850.0, 0.8, 480, ST_SetSRID(ST_Point(79.8225, 11.9265), 4326)),
('80000000-0000-0000-0000-000000000002', 'FLT-2026-0002', 'Transformer Oil Leakage', 'DTR-HERI-02 radiator fin seep with high temperature alarm (oil at 78C)', 'high', 'new', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000008', 2.0, 0.0, 2200.0, 1.4, 210, ST_SetSRID(ST_Point(79.8310, 11.9380), 4326))
ON CONFLICT (fault_code) DO NOTHING;

-- 13. Contractor Survey Staging & Approval Workflow
INSERT INTO public.survey_submissions (
    id, submission_code, contractor_id, je_id, ae_id, section_id, je_jurisdiction_id, work_order_number, title, asset_counts, status
) VALUES
('91000000-0000-0000-0000-000000000001', 'SURV-2026-081', '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000007', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'WO-RDSS-104', 'Marapalam Commercial Ward GPS Re-mapping', '{"poles": 4, "dts": 1, "consumers": 12, "smart_meters": 10}', 'submitted')
ON CONFLICT (submission_code) DO NOTHING;

INSERT INTO public.survey_staging_assets (
    id, submission_id, asset_type, temporary_code, attributes, gps_accuracy_m, altitude_m, validation_status, geom
) VALUES
('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'pole', 'TMP-POL-081-1', '{"pole_type": "PSCC 9m", "condition": "Good", "num_insulators": 3, "feeder": "FDR-MARA-01"}', 1.8, 12.4, 'valid', ST_SetSRID(ST_Point(79.8242, 11.9295), 4326)),
('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'consumer', 'TMP-CON-081-2', '{"consumer_number": "CON-04-102-9905", "meter_number": "SMTR-LT-44915", "is_smart_meter": true, "sanctioned_load_kw": 5.0}', 1.2, 11.9, 'valid', ST_SetSRID(ST_Point(79.8245, 11.9298), 4326))
ON CONFLICT DO NOTHING;

-- 14. Outage Reliability Metrics (IEEE 1366)
INSERT INTO public.outage_reliability_metrics (
    id, section_id, feeder_id, calculation_period, total_consumers_served, saifi, saidi, caidi, maifi, ens_mwh
) VALUES
('a1000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2026-Q1', 4850, 1.2400, 142.50, 114.92, 0.4500, 18.420),
('a1000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '2026-Q1', 3200, 0.8500, 78.20, 92.00, 0.2000, 9.150)
ON CONFLICT DO NOTHING;

-- 15. Safety Permits (PTW)
INSERT INTO public.safety_permits (
    id, ptw_number, feeder_id, applicant_id, issuing_officer_id, work_description, isolation_points, earthing_confirmed, danger_notices_posted, status, section_id
) VALUES
('b1000000-0000-0000-0000-000000000001', 'PTW-2026-041', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000007', 'Tree branch clearing on 11kV Feeder 1 between Pole 1 and Pole 4', 'Substation Breaker CB-MARA-01 opened and locked out; Isolator ISO-01 opened', TRUE, TRUE, 'isolated', '14000000-0000-0000-0000-000000000001')
ON CONFLICT (ptw_number) DO NOTHING;

-- 16. Stores Inventory
INSERT INTO public.stores_inventory (
    id, item_code, name, category, unit_of_measure, current_stock, reorder_level, unit_cost_inr, section_id
) VALUES
('c1000000-0000-0000-0000-000000000001', 'MAT-ACSR-RAB', 'Rabbit ACSR Conductor (50 sqmm)', 'Conductor', 'KM', 18.5, 5.0, 42000.0, '14000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000002', 'MAT-POL-PSCC9', 'PSCC Utility Pole 9m 200kg', 'Pole', 'NOS', 64.0, 20.0, 4800.0, '14000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000003', 'MAT-MTR-SMART', 'Single Phase Smart Energy Meter 5-30A', 'Smart Meter', 'NOS', 350.0, 100.0, 3200.0, '14000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000004', 'MAT-OIL-TRNS', 'Mineral Transformer Insulating Oil', 'Transformer Oil', 'LITRE', 1200.0, 400.0, 140.0, '14000000-0000-0000-0000-000000000001')
ON CONFLICT (item_code) DO NOTHING;

-- 17. Disaster Management Event
INSERT INTO public.disaster_events (
    id, code, event_type, name, affected_regions, start_date, status, damaged_poles_count, damaged_dts_count, snapped_conductors_km, restoration_pct
) VALUES
('d1000000-0000-0000-0000-000000000001', 'DIS-2026-CYCLONE', 'Cyclone Thane Category', 'Cyclone Storm Alert Response Plan', ARRAY['Puducherry', 'Karaikal'], '2026-11-01', 'restoration_in_progress', 8, 2, 3.4, 82.5)
ON CONFLICT (code) DO NOTHING;
