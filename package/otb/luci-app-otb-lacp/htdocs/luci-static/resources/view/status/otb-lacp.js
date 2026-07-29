'use strict';
'require dom';
'require poll';
'require rpc';
'require view';

const callStatus = rpc.declare({
	object: 'luci.otb_lacp',
	method: 'status',
	expect: { '': { bonds: [], thermal_zones: [], optical_modules: [] } }
});

function value(v, suffix) {
	return (v == null || v === '') ? '-' : String(v) + (suffix || '');
}

function vlanList(vlans) {
	if (!Array.isArray(vlans) || !vlans.length)
		return '-';

	return vlans.map(function(vlan) {
		var flags = Array.isArray(vlan.flags) && vlan.flags.length
			? ' (' + vlan.flags.join(', ') + ')'
			: '';

		return vlan.id + flags;
	}).join(', ');
}

function temperature(valueC, warningC, alarmC) {
	if (valueC == null)
		return E('span', {}, [_('Unavailable')]);

	var warning = warningC != null ? warningC : 70;
	var alarm = alarmC != null ? alarmC : 85;
	var color = valueC >= alarm
		? '#d00000'
		: (valueC >= warning ? '#d87900' : '#16823b');

	return E('strong', { 'style': 'color:' + color }, [
		Number(valueC).toFixed(1) + ' °C'
	]);
}

function state(v) {
	return String(v || '').toLowerCase() === 'up' ? _('Up') : value(v);
}

function summaryTable(bond) {
	var fields = [
		[_('Status'), state(bond.status)],
		[_('Mode'), value(bond.mode)],
		[_('Transmit hash policy'), value(bond.hash_policy)],
		[_('LACP rate'), value(bond.lacp_rate)],
		[_('Minimum active links'), value(bond.min_links)],
		[_('Active members'), value(bond.active_ports)],
		[_('Partner MAC address'), value(bond.partner_mac)],
		[_('VLANs on logical bond'), vlanList(bond.vlans)]
	];

	return E('table', { 'class': 'table' }, fields.map(function(field) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left', 'width': '30%' }, [field[0]]),
			E('td', { 'class': 'td left' }, [field[1]])
		]);
	}));
}

function membersTable(bond) {
	var rows = (bond.slaves || []).map(function(slave) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left' }, [value(slave.name)]),
			E('td', { 'class': 'td left' }, [state(slave.status)]),
			E('td', { 'class': 'td left' }, [value(slave.speed)]),
			E('td', { 'class': 'td left' }, [value(slave.duplex)]),
			E('td', { 'class': 'td left' }, [value(slave.aggregator_id)]),
			E('td', { 'class': 'td left' }, [
				value(slave.actor_churn) + ' / ' + value(slave.partner_churn)
			]),
			E('td', { 'class': 'td left' }, [
				vlanList(slave.inherited_vlans)
			])
		]);
	});

	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th left' }, [_('Member')]),
			E('th', { 'class': 'th left' }, [_('Link')]),
			E('th', { 'class': 'th left' }, [_('Speed')]),
			E('th', { 'class': 'th left' }, [_('Duplex')]),
			E('th', { 'class': 'th left' }, [_('Aggregator')]),
			E('th', { 'class': 'th left' }, [_('Actor / partner churn')]),
			E('th', { 'class': 'th left' }, [_('Inherited VLANs')])
		])
	].concat(rows));
}

function thermalTable(zones) {
	var rows = (zones || []).map(function(zone) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left' }, [value(zone.type || zone.name)]),
			E('td', { 'class': 'td left' }, [
				temperature(zone.temperature_c, 70, 85)
			]),
			E('td', { 'class': 'td left' }, [
				value(zone.critical_c, zone.critical_c != null ? ' °C' : '')
			])
		]);
	});

	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th left' }, [_('Sensor')]),
			E('th', { 'class': 'th left' }, [_('Temperature')]),
			E('th', { 'class': 'th left' }, [_('Kernel critical threshold')])
		])
	].concat(rows));
}

function opticsTable(modules) {
	var rows = (modules || []).map(function(module) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left' }, [value(module.interface)]),
			E('td', { 'class': 'td left' }, [state(module.link)]),
			E('td', { 'class': 'td left' }, [
				temperature(
					module.temperature_c,
					70,
					85
				)
			]),
			E('td', { 'class': 'td left' }, [
				value(
					module.temperature_high_warning_c,
					module.temperature_high_warning_c != null ? ' °C' : ''
				) + ' / ' + value(
					module.temperature_high_alarm_c,
					module.temperature_high_alarm_c != null ? ' °C' : ''
				)
			]),
			E('td', { 'class': 'td left' }, [
				value(module.voltage_v, module.voltage_v != null ? ' V' : '')
			]),
			E('td', { 'class': 'td left' }, [
				value(module.bias_ma, module.bias_ma != null ? ' mA' : '')
			]),
			E('td', { 'class': 'td left' }, [
				value(module.tx_dbm, module.tx_dbm != null ? ' dBm' : '')
			]),
			E('td', { 'class': 'td left' }, [
				value(module.rx_dbm, module.rx_dbm != null ? ' dBm' : '')
			]),
			E('td', { 'class': 'td left' }, [
				module.dom_supported
					? [
						value(module.vendor) + ' ' + value(module.part_number),
						module.serial ? ' · SN ' + module.serial : '',
						module.wavelength_nm != null ? ' · ' + module.wavelength_nm + ' nm' : ''
					].join('')
					: _('DOM unavailable')
			])
		]);
	});

	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th left' }, [_('Port')]),
			E('th', { 'class': 'th left' }, [_('Link')]),
			E('th', { 'class': 'th left' }, [_('Temperature')]),
			E('th', { 'class': 'th left' }, [_('Module warning / alarm')]),
			E('th', { 'class': 'th left' }, [_('Voltage')]),
			E('th', { 'class': 'th left' }, [_('Laser bias')]),
			E('th', { 'class': 'th left' }, [_('TX power')]),
			E('th', { 'class': 'th left' }, [_('RX power')]),
			E('th', { 'class': 'th left' }, [_('Module')])
		])
	].concat(rows));
}

function renderContent(data) {
	var bonds = data && Array.isArray(data.bonds) ? data.bonds : [];
	var content = [
		E('h2', {}, [_('LACP and temperatures')]),
		E('div', { 'class': 'cbi-section-descr' }, [
			_('VLAN membership belongs to the logical bond. The same VLANs are repeated below on each physical member as inherited VLANs.')
		]),
		E('div', { 'class': 'cbi-section-descr' }, [
			_('Thermal display is warning from 70 °C and critical from 85 °C. Hardware thresholds remain visible separately.'),
			' ',
			_('Last refresh:'),
			' ',
			new Date().toLocaleTimeString()
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, [_('Fanless switch temperature')]),
			thermalTable(data.thermal_zones || [])
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, [_('SFP optical telemetry')]),
			opticsTable(data.optical_modules || [])
		])
	];

	if (!bonds.length) {
		content.push(E('div', { 'class': 'alert-message warning' }, [
			_('No active bonding device was found.')
		]));
	}

	bonds.forEach(function(bond) {
		content.push(E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, [value(bond.name)]),
			summaryTable(bond),
			E('h4', {}, [_('Physical members')]),
			membersTable(bond)
		]));
	});

	return E('div', {}, content);
}

return view.extend({
	load: function() {
		return L.resolveDefault(callStatus(), {
			bonds: [],
			thermal_zones: [],
			optical_modules: []
		});
	},

	render: function(data) {
		var container = E('div', {}, []);

		dom.content(container, renderContent(data));
		poll.add(function() {
			return L.resolveDefault(callStatus(), {
				bonds: [],
				thermal_zones: [],
				optical_modules: []
			}).then(function(freshData) {
				dom.content(container, renderContent(freshData));
			});
		}, 15);

		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
