'use strict';
'require baseclass';
'require poll';
'require rpc';

const callStatus = rpc.declare({
	object: 'luci.otb_ports',
	method: 'status',
	expect: { '': { ports: [], bonds: [] } }
});

function value(v) {
	return (v == null || v === '') ? '—' : String(v);
}

function vlanToken(vlan) {
	let mode = vlan.pvid && vlan.untagged
		? 'U/PVID'
		: (vlan.untagged ? 'U' : 'T');
	let source = vlan.inherited_from
		? ' via ' + vlan.inherited_from
		: '';

	return E('span', {
		'class': 'otb-overview-vlan ' + (vlan.untagged ? 'untagged' : 'tagged'),
		'title': 'VLAN %s · %s%s'.format(vlan.id, mode, source)
	}, [ '%s %s'.format(vlan.id, mode) ]);
}

function renderVlans(port) {
	if (!Array.isArray(port.vlans) || !port.vlans.length)
		return E('span', { 'class': 'otb-overview-no-vlan' }, [ _('Aucun VLAN') ]);

	return E('div', { 'class': 'otb-overview-vlans' },
		port.vlans.map(vlanToken));
}

function portCard(port) {
	let up = port.carrier == 1;
	let slow = up && port.speed_mbps != null && port.speed_mbps < 1000;
	let state = !up
		? _('Hors ligne')
		: (slow ? _('Négociation faible') : _('Actif'));
	let relation = port.bond
		? _('via %s').format(port.bond)
		: (port.master ? _('sur %s').format(port.master) : _('port autonome'));

	return E('div', {
		'class': 'otb-overview-port ' + (up ? 'up' : 'down') + (slow ? ' slow' : '')
	}, [
		E('div', { 'class': 'otb-overview-name' }, [
			E('strong', {}, [ value(port.name) ]),
			E('span', { 'class': 'otb-overview-state' }, [ state ])
		]),
		E('div', { 'class': 'otb-overview-link' }, [
			port.speed_mbps
				? '%s Mbit/s · %s'.format(port.speed_mbps, value(port.duplex))
				: value(port.operstate),
			E('br'),
			E('small', {}, [ relation ])
		]),
		renderVlans(port)
	]);
}

function renderStatus(data) {
	let ports = data && Array.isArray(data.ports) ? data.ports : [];

	return E('div', {}, [
		E('style', {}, [ `
.otb-overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.65rem;margin-bottom:1rem}
.otb-overview-port{border:1px solid rgba(127,127,127,.3);border-top:4px solid #9b2c2c;border-radius:.55rem;padding:.65rem;min-width:0}.otb-overview-port.up{border-top-color:#16823b}.otb-overview-port.slow{border-top-color:#d87900}
.otb-overview-name{display:flex;justify-content:space-between;gap:.4rem}.otb-overview-state{font-size:.72rem;font-weight:600}.otb-overview-link{margin:.35rem 0;font-size:.86rem}
.otb-overview-vlans{display:flex;flex-wrap:wrap;gap:.22rem}.otb-overview-vlan{border-radius:.3rem;padding:.12rem .28rem;font-size:.68rem;font-weight:700}.otb-overview-vlan.tagged{background:#dcecff;color:#174a7c}.otb-overview-vlan.untagged{background:#e2f5e5;color:#175c2a}.otb-overview-no-vlan{font-size:.72rem;color:#9a3412;font-weight:600}
` ]),
		E('div', { 'class': 'otb-overview-grid' }, ports.map(portCard))
	]);
}

return baseclass.extend({
	title: _('État réel des ports et VLAN'),

	load() {
		return L.resolveDefault(callStatus(), { ports: [], bonds: [] });
	},

	render(data) {
		const root = E('div', {}, [ renderStatus(data) ]);

		poll.add(() => L.resolveDefault(callStatus(), {
			ports: [],
			bonds: []
		}).then(fresh => {
			const updated = renderStatus(fresh);
			root.replaceChildren(...updated.childNodes);
		}), 10);

		return root;
	}
});
