import type { OfficialRole } from '../types/auth';

export type Capability = 'dashboard.view' | 'asset.read' | 'asset.write' | 'fault.create' | 'fault.update' | 'workorder.read' | 'workorder.write' | 'survey.submit' | 'survey.verify' | 'survey.approve' | 'ptw.issue' | 'ptw.approve' | 'scada.view' | 'scada.control' | 'stores.issue' | 'admin.users' | 'admin.system';

const all: Capability[] = ['dashboard.view','asset.read','asset.write','fault.create','fault.update','workorder.read','workorder.write','survey.submit','survey.verify','survey.approve','ptw.issue','ptw.approve','scada.view','scada.control','stores.issue','admin.users','admin.system'];
const registry: Record<string, Capability[]> = {
 super_admin: all,
 se: all.filter(x => !['admin.users','admin.system'].includes(x)),
 ee: all.filter(x => !['admin.users','admin.system'].includes(x)),
 aee: all.filter(x => !['admin.users','admin.system','scada.control'].includes(x)),
 ae: all.filter(x => !['admin.users','admin.system'].includes(x)),
 je: ['dashboard.view','asset.read','fault.create','fault.update','workorder.read','survey.submit','survey.verify','scada.view'],
 contractor: ['dashboard.view','asset.read','fault.create','survey.submit','workorder.read'],
 auditor: ['dashboard.view','asset.read','workorder.read','scada.view'],
 gis_admin: ['dashboard.view','asset.read','asset.write','fault.create','fault.update','survey.submit','survey.verify','survey.approve','scada.view','admin.system'],
};

export const getCapabilities = (role: OfficialRole | string): Capability[] => registry[role] ?? [];
export const hasCapability = (role: OfficialRole | string, capability: Capability): boolean => getCapabilities(role).includes(capability);
