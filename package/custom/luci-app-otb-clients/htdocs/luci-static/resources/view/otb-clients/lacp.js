'use strict';
'require view';
'require fs';
'require poll';
'require dom';

function parseStatus(output) {
	try { return JSON.parse(String(output || '{}')); }
	catch (e) { return { present: false, error: e.message || String(e) }; }
}

function value(data, name) {
	return data[name] == null || data[name] === '' ? '—' : String(data[name]);
}

function stateBadge(ok, text) {
	return E('span', {
		'class': 'otb-lacp-badge ' + (ok ? 'up' : 'down')
	}, [ text ]);
}

function vlanLabel(entry) {
	const parts = String(entry || '').split(':');
	return parts.length > 1 ? 'VLAN ' + parts.slice(1).join(':') : String(entry);
}

function memberCard(member, vlans) {
	const up = member.carrier == 1 && member.mii_status == 'up';
	const detail = [
		_('État physique'), value(member, 'operstate'),
		_('MII'), value(member, 'mii_status'),
		_('Vitesse'), member.speed ? member.speed + ' Mbit/s' : '—',
		_('Duplex'), value(member, 'duplex'),
		_('Agrégateur'), value(member, 'ad_aggregator_id'),
		_('Pannes de lien'), value(member, 'link_failure_count'),
		_('État LACP acteur'), value(member, 'ad_actor_oper_port_state'),
		_('État LACP partenaire'), value(member, 'ad_partner_oper_port_state'),
		_('Adresse physique'), value(member, 'perm_hwaddr')
	];

	return E('div', { 'class': 'otb-lacp-member ' + (up ? 'up' : 'down') }, [
		E('div', { 'class': 'otb-lacp-title' }, [
			E('strong', {}, [ member.name || '—' ]),
			stateBadge(up, up ? _('Actif') : _('Dégradé'))
		]),
		E('div', { 'class': 'otb-lacp-vlans' }, (vlans || []).map(v =>
			E('span', { 'class': 'label' }, [ vlanLabel(v) ])
		)),
		E('dl', {}, detail.reduce((nodes, item, index) => {
			nodes.push(index % 2 == 0 ? E('dt', {}, [ item ]) : E('dd', {}, [ item ]));
			return nodes;
		}, []))
	]);
}

function renderStatus(data) {
	if (!data.present)
		return E('div', { 'class': 'alert-message error' }, [ data.error || _('Bond absent') ]);

	const summary = [
		_('Interface'), value(data, 'bond'),
		_('État'), value(data, 'mii_status'),
		_('Mode'), value(data, 'mode'),
		_('Rythme LACP'), value(data, 'lacp_rate'),
		_('Répartition'), value(data, 'xmit_hash_policy'),
		_('Liens minimum'), value(data, 'min_links'),
		_('Agrégateur actif'), value(data, 'ad_aggregator'),
		_('Nombre de ports'), value(data, 'ad_num_ports'),
		_('Partenaire'), value(data, 'ad_partner_mac')
	];

	return E('div', {}, [
		E('dl', { 'class': 'otb-lacp-summary' }, summary.reduce((nodes, item, index) => {
			nodes.push(index % 2 == 0 ? E('dt', {}, [ item ]) : E('dd', {}, [ item ]));
			return nodes;
		}, [])),
		E('h3', {}, [ _('Ports membres et VLAN transportés') ]),
		E('div', { 'class': 'otb-lacp-grid' }, (data.members || []).map(m => memberCard(m, data.vlans || [])))
	]);
}

const style = `
.otb-lacp-summary{display:grid;grid-template-columns:minmax(150px,230px) 1fr;gap:.35rem 1rem;border:1px solid rgba(127,127,127,.3);border-radius:.6rem;padding:1rem;margin:1rem 0}
.otb-lacp-summary dt,.otb-lacp-member dt{font-weight:600}.otb-lacp-summary dd,.otb-lacp-member dd{margin:0}
.otb-lacp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1rem}
.otb-lacp-member{border:1px solid rgba(127,127,127,.3);border-left:5px solid #b42318;border-radius:.6rem;padding:1rem}.otb-lacp-member.up{border-left-color:#2d8a34}
.otb-lacp-title{display:flex;justify-content:space-between;align-items:center;font-size:1.1rem}.otb-lacp-badge{border-radius:999px;padding:.15rem .55rem;color:#fff;background:#b42318}.otb-lacp-badge.up{background:#2d8a34}
.otb-lacp-member dl{display:grid;grid-template-columns:1fr 1fr;gap:.25rem .8rem}.otb-lacp-vlans{display:flex;flex-wrap:wrap;gap:.3rem;margin:.7rem 0}.otb-lacp-vlans .label{font-weight:600}
`;

return view.extend({
	load() {
		return L.resolveDefault(fs.exec_direct('/usr/libexec/otb-lacp/status.sh', [ 'bond-trunk' ]), '{}');
	},

	render(output) {
		const root = E('div', {}, [
			E('style', {}, [ style ]),
			E('h2', {}, [ _('LACP 2x10') ]),
			E('p', { 'class': 'cbi-map-descr' }, [
				_('État en lecture seule du bond, de ses deux membres physiques et des VLAN hérités de bond-trunk.')
			]),
			E('div', { 'id': 'otb-lacp-content' }, [ renderStatus(parseStatus(output)) ])
		]);

		poll.add(() => fs.exec_direct('/usr/libexec/otb-lacp/status.sh', [ 'bond-trunk' ]).then(result => {
			const node = root.querySelector('#otb-lacp-content');
			if (node)
				dom.content(node, renderStatus(parseStatus(result)));
		}), 5);

		return root;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
