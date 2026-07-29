'use strict';
'require dom';
'require poll';
'require rpc';
'require view';

const callStatus = rpc.declare({
	object: 'luci.otb_ports',
	method: 'status',
	expect: { '': { ports: [], bonds: [] } }
});

function value(v, suffix) {
	return (v == null || v === '') ? '—' : String(v) + (suffix || '');
}

function linkBadge(up) {
	return E('span', {
		'class': 'otb-port-badge ' + (up ? 'up' : 'down')
	}, [ up ? _('Actif') : _('Hors ligne') ]);
}

function vlanBadge(vlan) {
	let mode = vlan.pvid && vlan.untagged
		? _('non taggé · PVID')
		: (vlan.untagged ? _('non taggé') : _('taggé'));
	let inherited = vlan.inherited_from
		? ' · ' + _('via %s').format(vlan.inherited_from)
		: '';

	return E('span', {
		'class': 'otb-vlan-badge ' + (vlan.untagged ? 'untagged' : 'tagged'),
		'title': (vlan.flags || []).join(', ')
	}, [ 'VLAN %s · %s%s'.format(vlan.id, mode, inherited) ]);
}

function vlanBadges(vlans) {
	if (!Array.isArray(vlans) || !vlans.length)
		return E('span', { 'class': 'otb-no-vlan' }, [ _('Aucun VLAN effectif') ]);

	return E('div', { 'class': 'otb-vlan-list' },
		vlans.map(vlan => vlanBadge(vlan)));
}

function portCard(port) {
	const up = port.carrier == 1;
	const relation = port.bond
		? _('Membre de %s').format(port.bond)
		: (port.master ? _('Rattaché à %s').format(port.master) : _('Port autonome'));

	return E('div', { 'class': 'otb-port-card ' + (up ? 'up' : 'down') }, [
		E('div', { 'class': 'otb-port-title' }, [
			E('strong', {}, [ value(port.name) ]),
			linkBadge(up)
		]),
		E('div', { 'class': 'otb-port-link' }, [
			port.speed_mbps
				? '%s Mbit/s · %s'.format(port.speed_mbps, value(port.duplex))
				: value(port.operstate),
			E('br'),
			E('small', {}, [ relation ])
		]),
		vlanBadges(port.vlans)
	]);
}

function bondSummary(bond) {
	const members = (bond.slaves || []).map(slave => {
		const ok = String(slave.status || '').toLowerCase() === 'up';
		return E('li', {}, [
			linkBadge(ok),
			' ',
			value(slave.name),
			' · ',
			value(slave.speed),
			' · ',
			_('agrégateur %s').format(value(slave.aggregator_id))
		]);
	});

	return E('div', { 'class': 'otb-bond-card' }, [
		E('h3', {}, [ value(bond.name) ]),
		E('p', {}, [
			value(bond.mode),
			' · ',
			_('%s membre(s) actif(s)').format(value(bond.active_ports)),
			' · ',
			value(bond.hash_policy)
		]),
		vlanBadges(bond.vlans),
		E('ul', {}, members)
	]);
}

function renderContent(data) {
	const ports = data && Array.isArray(data.ports) ? data.ports : [];
	const bonds = data && Array.isArray(data.bonds) ? data.bonds : [];

	return E('div', {}, [
		E('style', {}, [ `
.otb-port-intro{margin-bottom:1rem}.otb-bond-grid,.otb-port-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.otb-bond-card,.otb-port-card{border:1px solid rgba(127,127,127,.3);border-radius:.65rem;padding:1rem;background:var(--background-color-high,#fff)}
.otb-port-card{border-left:5px solid #a52a2a}.otb-port-card.up{border-left-color:#16823b}.otb-port-title{display:flex;justify-content:space-between;align-items:center;font-size:1.08rem}
.otb-port-badge{display:inline-block;border-radius:999px;padding:.12rem .55rem;background:#a52a2a;color:#fff;font-size:.78rem}.otb-port-badge.up{background:#16823b}
.otb-port-link{margin:.65rem 0}.otb-vlan-list{display:flex;flex-wrap:wrap;gap:.35rem}.otb-vlan-badge{display:inline-block;border-radius:.4rem;padding:.22rem .45rem;font-weight:600;font-size:.79rem}
.otb-vlan-badge.tagged{background:#dcecff;color:#174a7c}.otb-vlan-badge.untagged{background:#e2f5e5;color:#175c2a}.otb-no-vlan{color:#9a3412;font-weight:600}
.otb-bond-card ul{padding-left:1.2rem}.otb-bond-card li{margin:.35rem 0}
` ]),
		E('h2', {}, [ _('Ports, LACP et VLAN effectifs') ]),
		E('p', { 'class': 'otb-port-intro cbi-map-descr' }, [
			_('Cette vue lit l’état réellement programmé dans le bridge Linux. Les VLAN des membres physiques d’un LAG sont indiqués comme hérités du bond logique, avec le mode taggé, non taggé et PVID.')
		]),
		E('h3', {}, [ _('Agrégats') ]),
		bonds.length
			? E('div', { 'class': 'otb-bond-grid' }, bonds.map(bondSummary))
			: E('p', {}, [ _('Aucun agrégat présent.') ]),
		E('h3', {}, [ _('Ports physiques') ]),
		E('div', { 'class': 'otb-port-grid' }, ports.map(portCard)),
		E('p', { 'class': 'cbi-map-descr' }, [
			_('Dernière lecture : %s').format(new Date().toLocaleTimeString())
		])
	]);
}

return view.extend({
	load() {
		return L.resolveDefault(callStatus(), { ports: [], bonds: [] });
	},

	render(data) {
		const container = E('div', {}, []);
		dom.content(container, renderContent(data));

		poll.add(() => L.resolveDefault(callStatus(), {
			ports: [],
			bonds: []
		}).then(fresh => dom.content(container, renderContent(fresh))), 10);

		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
