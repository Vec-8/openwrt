'use strict';
'require baseclass';
'require rpc';

const callOverview = rpc.declare({
	object: 'luci.otb_overview',
	method: 'status',
	expect: { '': {} }
});

const callPorts = rpc.declare({
	object: 'luci.otb_ports',
	method: 'status',
	expect: { '': { ports: [], bonds: [], bridge_vlans: {} } }
});

const callTelemetry = rpc.declare({
	object: 'luci.otb_telemetry',
	method: 'status',
	expect: {
		'': {
			system: {},
			thermal_zones: [],
			hardware_temperatures: [],
			optical_modules: []
		}
	}
});

const callClients = rpc.declare({
	object: 'luci.otb-clients',
	method: 'getStatus',
	expect: {
		'': {
			nodes: [],
			wifi: [],
			ethernet: [],
			summary: {}
		}
	}
});

const LEVELS = { neutral: 0, ok: 1, warn: 2, critical: 3 };

function list(value) {
	return Array.isArray(value) ? value : [];
}

function number(value) {
	if (value == null || value === '')
		return null;

	let parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function present(value, fallback) {
	return value == null || value === '' ? (fallback || '—') : String(value);
}

function oneDecimal(value, suffix) {
	value = number(value);
	return value == null ? '—' : value.toFixed(1).replace('.', ',') + (suffix || '');
}

function formatDuration(seconds) {
	seconds = Math.max(0, Math.floor(number(seconds) || 0));
	let days = Math.floor(seconds / 86400);
	let hours = Math.floor((seconds % 86400) / 3600);
	let minutes = Math.floor((seconds % 3600) / 60);

	if (days)
		return days + ' j ' + hours + ' h';
	if (hours)
		return hours + ' h ' + minutes + ' min';
	return minutes + ' min';
}

function formatKiB(kib) {
	kib = number(kib);
	if (kib == null)
		return '—';
	if (kib >= 1024 * 1024)
		return (kib / 1024 / 1024).toFixed(1).replace('.', ',') + ' Gio';
	if (kib >= 1024)
		return (kib / 1024).toFixed(1).replace('.', ',') + ' Mio';
	return Math.round(kib) + ' Kio';
}

function raise(current, candidate) {
	return LEVELS[candidate] > LEVELS[current] ? candidate : current;
}

function badge(level, label, title) {
	return E('span', {
		'class': 'otb-summary-badge ' + level,
		'title': title || label
	}, [
		E('span', { 'class': 'otb-summary-dot' }),
		label
	]);
}

function card(title, level, headline, lines, href, linkLabel) {
	let children = [
		E('div', { 'class': 'otb-summary-card-title' }, [
			E('span', {}, [ title ]),
			badge(level, level === 'ok' ? 'OK' :
				(level === 'warn' ? 'À surveiller' :
					(level === 'critical' ? 'Défaut' : 'Information')))
		]),
		E('div', { 'class': 'otb-summary-card-headline' }, [ headline ])
	];

	for (let line of (lines || []))
		children.push(E('div', { 'class': 'otb-summary-card-line' }, [ line ]));

	if (href)
		children.push(E('a', {
			'class': 'otb-summary-card-link',
			'href': href
		}, [ linkLabel || 'Voir le détail' ]));

	return E('div', {
		'class': 'otb-summary-card ' + level
	}, children);
}

function systemHealth(telemetry) {
	let system = telemetry.system || {};
	let zones = list(telemetry.thermal_zones);
	let temperatures = zones.map(zone => number(zone.temperature_c))
		.filter(value => value != null);
	let maximum = temperatures.length ? Math.max.apply(null, temperatures) : null;
	let memory = system.memory || {};
	let load = system.load || {};
	let level = 'ok';

	if (maximum != null && maximum >= 85)
		level = 'critical';
	else if (maximum != null && maximum >= 70)
		level = 'warn';

	if (number(memory.used_percent) >= 90)
		level = raise(level, 'critical');
	else if (number(memory.used_percent) >= 80)
		level = raise(level, 'warn');

	return {
		level,
		maximum,
		card: card(
			'Santé système',
			level,
			maximum == null ? 'Température indisponible' :
				'SoC ' + oneDecimal(maximum, ' °C'),
			[
				'RAM ' + oneDecimal(memory.used_percent, ' %') +
					' · charge ' + oneDecimal(load.load_1, ''),
				'Uptime ' + formatDuration(system.uptime_s) +
					' · noyau ' + present(system.kernel)
			],
			L.url('admin/status/otb-telemetry'),
			'Télémétrie complète'
		)
	};
}

function plannedInfrastructure(overview, token) {
	token = String(token || '').toLowerCase();
	for (let device of list((overview.supervision || {}).devices)) {
		let id = String(device.id || '').toLowerCase();
		let name = String(device.name || '').toLowerCase();
		if ((id.indexOf(token) >= 0 || name.indexOf(token) >= 0) &&
		    device.planned && !device.online)
			return true;
	}
	return false;
}

function bondState(overview, portsData) {
	let bonds = list(portsData.bonds);
	let rows = [];
	let active = 0;
	let expected = 0;
	let level = 'neutral';
	let aggregateMbps = 0;
	let vlanIds = {};

	for (let bond of bonds) {
		let slaves = list(bond.slaves);
		let planned = /nord/i.test(bond.name || '') &&
			plannedInfrastructure(overview, 'nord');
		let upSlaves = slaves.filter(slave => slave.status === 'up');
		let aggregators = {};

		for (let slave of upSlaves) {
			if (slave.aggregator_id != null)
				aggregators[String(slave.aggregator_id)] = true;
		}

		let sameAggregator = Object.keys(aggregators).length <= 1;
		let healthy = bond.status === 'up' && slaves.length > 0 &&
			upSlaves.length === slaves.length && sameAggregator;
		let speedMbps = 0;

		for (let slave of upSlaves) {
			let match = String(slave.speed || '').match(/[0-9]+/);
			speedMbps += match ? Number(match[0]) : 0;
		}
		for (let vlan of list(bond.vlans)) {
			if (vlan.id != null)
				vlanIds[String(vlan.id)] = true;
		}

		if (!planned)
			expected++;
		if (healthy) {
			active++;
			aggregateMbps += speedMbps;
			level = raise(level, 'ok');
		}
		else if (!planned) {
			level = raise(level, 'critical');
		}

		rows.push({
			name: bond.name,
			healthy,
			planned,
			speed_mbps: speedMbps,
			up: upSlaves.length,
			total: slaves.length,
			same_aggregator: sameAggregator,
			vlans: list(bond.vlans)
		});
	}

	if (!bonds.length)
		level = 'neutral';

	let headline;
	if (!bonds.length)
		headline = 'Aucun agrégat LACP';
	else if (bonds.length === 1)
		headline = rows[0].up + '/' + rows[0].total + ' liens · ' +
			(rows[0].speed_mbps / 1000) + ' Gbit/s agrégés';
	else
		headline = active + '/' + expected + ' agrégats déployés actifs';

	return {
		level,
		rows,
		active,
		expected,
		aggregate_mbps: aggregateMbps,
		vlan_ids: Object.keys(vlanIds).sort((a, b) => Number(a) - Number(b)),
		card: card(
			'Backbone et LACP',
			level,
			headline,
			[
				Object.keys(vlanIds).length ?
					'VLAN effectifs : ' +
						Object.keys(vlanIds)
							.sort((a, b) => Number(a) - Number(b)).join(', ') :
					'VLAN effectifs : aucun',
				rows.map(row =>
					row.name + ' ' +
					(row.planned ? 'prévu' :
						(row.healthy ? 'actif' : 'défaillant')) +
					' (' + row.up + '/' + row.total + ')'
				).join(' · ') || 'Aucun membre'
			],
			L.url('admin/status/otb-ports'),
			'Ports constructeur, états et VLAN'
		)
	};
}

function wanCard(overview) {
	let summary = overview.wan_summary || {};
	let wans = list(overview.wans);
	let total = number(summary.total) || wans.length;
	let online = number(summary.online) || 0;
	let level = online === total && total > 0 ? 'ok' :
		(online > 0 ? 'warn' : 'critical');

	return card(
		'Accès Internet',
		level,
		online + '/' + total + ' WAN en ligne',
		[
			wans.map(wan => wan.label + ' : ' +
				(wan.online ? 'en ligne' : 'hors ligne')).join(' · '),
			'Auto-guérison : ' +
				(summary.heal_running ? 'active' : 'inactive')
		],
		L.url('admin/status/mwan3'),
		'Détail MultiWAN'
	);
}

function wifiCard(overview) {
	let wifi = overview.wifi || {};
	let radios = list(wifi.radios);
	let activeInterfaces = list(wifi.interfaces)
		.filter(iface => iface.active);
	let expectedMlo = /r4/.test(overview.role || '') ? 3 : 0;
	let level = 'ok';

	if (radios.length && number(wifi.radios_up) !== radios.length)
		level = 'critical';
	if (expectedMlo && number(wifi.mlo_active) < expectedMlo)
		level = raise(level, 'critical');

	let radioText = radios.map(radio =>
		present(radio.band).toUpperCase() + ' ' +
		present(radio.htmode) + ' ch.' + present(radio.channel) +
		' · ' + present(radio.country)
	).join(' · ');

	return card(
		'Wi-Fi et MLO',
		level,
		present(wifi.radios_up, '0') + '/' + radios.length +
			' radios · ' + present(wifi.mlo_active, '0') + ' MLO',
		[
			activeInterfaces.map(iface =>
				iface.ssid + (iface.mlo ? ' · MLO' : ' · autonome')
			).join(' · ') || 'Aucun point d’accès actif',
			radioText || 'Aucune radio sur cet équipement'
		],
		L.url('admin/network/wireless'),
		'Configuration Wi-Fi'
	);
}

function opticalState(telemetry) {
	let modules = list(telemetry.optical_modules);
	let active = modules.filter(module => module.eeprom_detected ||
		module.dom_supported || module.link === 'up');
	let hottest = null;
	let minMargin = null;
	let alarms = 0;
	let warnings = 0;
	let level = active.length ? 'ok' : 'neutral';

	for (let module of active) {
		let temperature = number((module.temperature || {}).value);
		let margin = number((module.temperature || {}).margin_to_warning);
		if (temperature != null && (hottest == null || temperature > hottest))
			hottest = temperature;
		if (margin != null && (minMargin == null || margin < minMargin))
			minMargin = margin;
		alarms += number(module.alarm_count) || 0;
		warnings += number(module.warning_count) || 0;
		if (module.severity === 'alarm' || (number(module.alarm_count) || 0) > 0)
			level = raise(level, 'critical');
		else if (module.severity === 'warning' ||
		         (number(module.warning_count) || 0) > 0)
			level = raise(level, 'warn');
	}

	if (minMargin != null && minMargin <= 0)
		level = raise(level, 'critical');
	else if (minMargin != null && minMargin <= 5)
		level = raise(level, 'warn');

	return {
		level,
		modules,
		active,
		hottest,
		min_margin: minMargin,
		alarms,
		warnings,
		card: card(
			'Optiques',
			level,
			active.length + ' module' + (active.length > 1 ? 's' : '') +
				' détecté' + (active.length > 1 ? 's' : ''),
			[
				'Plus chaud : ' + oneDecimal(hottest, ' °C') +
					' · marge thermique : ' + oneDecimal(minMargin, ' °C'),
				'Alarmes : ' + alarms + ' · avertissements : ' + warnings
			],
			L.url('admin/status/otb-telemetry'),
			'DDM complet'
		)
	};
}

function servicesAndStorage(overview) {
	let services = list(overview.services);
	let storage = list(overview.storage);
	let level = 'ok';
	let running = services.filter(service => service.running).length;

	for (let service of services) {
		if (!service.running)
			level = raise(level,
				service.name === 'otb-homeassistant' ? 'critical' : 'warn');
	}
	for (let item of storage) {
		if (number(item.used_percent) >= 90)
			level = raise(level, 'critical');
		else if (number(item.used_percent) >= 80)
			level = raise(level, 'warn');
	}

	let srv = storage.find(item => item.path === '/srv');
	return card(
		'Domotique et stockage',
		level,
		running + '/' + services.length + ' services actifs',
		[
			services.map(service => service.label + ' : ' +
				(service.running ? 'actif' : present(service.state)))
				.join(' · ') || 'Aucun service domotique attendu',
			srv ? '/srv ' + srv.used_percent + ' % utilisé · ' +
				formatKiB(srv.available_kib) + ' libres' :
				'Stockage /srv non détecté'
		],
		null
	);
}

function clientsCard(clients) {
	let summary = clients.summary || {};
	let nodes = list(clients.nodes).filter(node => node.enabled !== false &&
		node.configured !== false);
	let onlineNodes = nodes.filter(node => node.online).length;
	let critical = number(summary.critical) || 0;
	let degraded = number(summary.degraded) || 0;
	let level = critical || degraded ? 'warn' : 'ok';

	return card(
		'Clients réseau',
		level,
		present(summary.wifi, '0') + ' Wi-Fi · ' +
			present(summary.ethernet, '0') + ' Ethernet',
		[
			onlineNodes + '/' + nodes.length + ' nœuds R4 actifs',
			critical + ' critiques · ' + degraded + ' dégradés'
		],
		L.url('admin/status/otb-clients'),
		'Diagnostic clients et roaming'
	);
}

function supervisionCard(overview) {
	let supervision = overview.supervision || {};
	let summary = supervision.summary || {};
	let devices = list(supervision.devices);
	let deployedInfrastructureOffline = devices.filter(device =>
		!device.online && !device.planned &&
		(/infrastructure/i.test(device.group || '') ||
		 /switch/i.test(device.group || ''))
	).length;
	let level = deployedInfrastructureOffline ? 'critical' : 'ok';

	return card(
		'Supervision IP',
		level,
		present(summary.online, '0') + '/' +
			((number(summary.total) || 0) - (number(summary.planned) || 0)) +
			' équipements déployés joignables',
		[
			present(summary.offline, '0') + ' hors ligne · ' +
				present(summary.planned, '0') + ' prévus',
			present(supervision.scope_label)
		],
		null
	);
}

function overallState(overview, telemetry, bonds) {
	let level = 'ok';
	let reasons = [];
	let health = systemHealth(telemetry);
	let optics = opticalState(telemetry);
	let summary = overview.wan_summary || {};
	let wifi = overview.wifi || {};

	function account(candidate, reason) {
		if (LEVELS[candidate] > LEVELS.ok) {
			level = raise(level, candidate);
			reasons.push(reason);
		}
	}

	if (overview.error)
		account('critical', overview.error);
	if (overview.stale)
		account('critical', 'relevé de supervision périmé');
	account(health.level, 'température ou mémoire à surveiller');
	account(optics.level, 'optique/DDM à surveiller');
	account(bonds.level, 'LACP non conforme');

	if (overview.role === 'r4pro') {
		if ((number(summary.online) || 0) === 0)
			account('critical', 'aucun WAN en ligne');
		else if (number(summary.online) !== number(summary.total))
			account('warn', 'un WAN est hors ligne');
		if (!summary.heal_running)
			account('warn', 'auto-guérison WAN inactive');
	}

	if (/r4/.test(overview.role || '')) {
		if (number(wifi.radios_up) < list(wifi.radios).length)
			account('critical', 'une radio Wi-Fi est hors ligne');
		if (number(wifi.mlo_active) < 3)
			account('critical', 'moins de trois groupes MLO actifs');
	}

	for (let service of list(overview.services)) {
		if (!service.running)
			account(service.name === 'otb-homeassistant' ?
				'critical' : 'warn', service.label + ' est arrêté');
	}
	for (let item of list(overview.storage)) {
		if (number(item.used_percent) >= 90)
			account('critical', item.path + ' dépasse 90 %');
		else if (number(item.used_percent) >= 80)
			account('warn', item.path + ' dépasse 80 %');
	}
	for (let device of list((overview.supervision || {}).devices)) {
		if (!device.online && !device.planned &&
		    (/infrastructure/i.test(device.group || '') ||
		     /switch/i.test(device.group || '')))
			account('critical', device.name + ' est injoignable');
	}

	return {
		level,
		reasons,
		label: level === 'ok' ? 'Opérationnel' :
			(level === 'warn' ? 'À surveiller' : 'Dégradé')
	};
}

function renderWanTable(overview) {
	if (overview.role !== 'r4pro')
		return null;

	let rows = list(overview.wans).map(wan => E('tr', { 'class': 'tr' }, [
		E('td', {}, [ E('strong', {}, [ present(wan.label) ]) ]),
		E('td', {}, [
			badge(wan.online ? 'ok' : 'critical',
				wan.online ? 'En ligne' : 'Hors ligne')
		]),
		E('td', {}, [ present(wan.device) ]),
		E('td', {}, [ present(wan.address) ]),
		E('td', {}, [ formatDuration(wan.uptime_s) ]),
		E('td', {}, [ present(wan.tracking) ])
	]));

	return E('div', { 'class': 'otb-summary-block' }, [
		E('h4', {}, [ 'Accès WAN — lecture seule' ]),
		E('table', { 'class': 'table otb-summary-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', {}, [ 'Accès' ]),
				E('th', {}, [ 'État' ]),
				E('th', {}, [ 'Interface' ]),
				E('th', {}, [ 'Adresse' ]),
				E('th', {}, [ 'Uptime' ]),
				E('th', {}, [ 'Suivi' ])
			])
		].concat(rows))
	]);
}

function renderBondTable(bondInfo) {
	if (!bondInfo.rows.length)
		return null;

	let rows = bondInfo.rows.map(row => {
		let vlanText = list(row.vlans).map(vlan => present(vlan.id))
			.join(', ') || 'Aucun';
		return E('tr', { 'class': 'tr' }, [
			E('td', {}, [ E('strong', {}, [ present(row.name) ]) ]),
			E('td', {}, [
				badge(row.planned ? 'neutral' :
					(row.healthy ? 'ok' : 'critical'),
				row.planned ? 'Prévu' :
					(row.healthy ? 'Actif' : 'Défaut'))
			]),
			E('td', {}, [ row.up + '/' + row.total ]),
			E('td', {}, [
				row.speed_mbps ? (row.speed_mbps / 1000) + ' Gbit/s' : '—'
			]),
			E('td', {}, [
				row.same_aggregator ? 'Unique' : 'Séparés'
			]),
			E('td', {}, [ vlanText ])
		]);
	});

	return E('div', { 'class': 'otb-summary-block' }, [
		E('h4', {}, [ 'Agrégats LACP effectifs' ]),
		E('table', { 'class': 'table otb-summary-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', {}, [ 'Agrégat' ]),
				E('th', {}, [ 'État' ]),
				E('th', {}, [ 'Membres' ]),
				E('th', {}, [ 'Capacité' ]),
				E('th', {}, [ 'Agrégateur' ]),
				E('th', {}, [ 'VLAN effectifs' ])
			])
		].concat(rows))
	]);
}

function renderOpticalTable(opticalInfo) {
	if (!opticalInfo.modules.length)
		return null;

	let rows = opticalInfo.modules.map(module => {
		let temperature = module.temperature || {};
		let moduleLevel = module.severity === 'alarm' ? 'critical' :
			(module.severity === 'warning' ? 'warn' :
				(module.link === 'up' ? 'ok' : 'neutral'));
		return E('tr', { 'class': 'tr' }, [
			E('td', {}, [ E('strong', {}, [ present(module.interface) ]) ]),
			E('td', {}, [
				badge(moduleLevel,
					module.severity === 'alarm' ? 'Alarme' :
						(module.severity === 'warning' ? 'Avertissement' :
							(module.link === 'up' ? 'Lien actif' :
								present(module.link))))
			]),
			E('td', {}, [ oneDecimal(temperature.value, ' °C') ]),
			E('td', {}, [
				oneDecimal(temperature.margin_to_warning, ' °C')
			]),
			E('td', {}, [ oneDecimal((module.tx || {}).value, ' dBm') ]),
			E('td', {}, [ oneDecimal((module.rx || {}).value, ' dBm') ]),
			E('td', {}, [
				module.dom_supported ? present(module.vendor) + ' · ' +
					present(module.part_number) : 'DDM indisponible'
			])
		]);
	});

	return E('div', { 'class': 'otb-summary-block' }, [
		E('h4', {}, [ 'Températures et niveaux des optiques' ]),
		E('table', { 'class': 'table otb-summary-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', {}, [ 'Port' ]),
				E('th', {}, [ 'État' ]),
				E('th', {}, [ 'Température' ]),
				E('th', {}, [ 'Marge thermique' ]),
				E('th', {}, [ 'TX' ]),
				E('th', {}, [ 'RX' ]),
				E('th', {}, [ 'Module' ])
			])
		].concat(rows))
	]);
}

function renderWifiProblems(clients) {
	let problematic = list(clients.wifi).filter(client =>
		client.severity === 'critical' || client.severity === 'degraded'
	).sort((a, b) => {
		let severity = { critical: 2, degraded: 1 };
		return (severity[b.severity] || 0) - (severity[a.severity] || 0) ||
			(number(a.score) || 0) - (number(b.score) || 0);
	}).slice(0, 6);

	if (!problematic.length)
		return null;

	let rows = problematic.map(client => E('tr', { 'class': 'tr' }, [
		E('td', {}, [
			E('strong', {}, [
				present(client.hostname || client.ip, 'Client sans nom')
			]),
			E('br'),
			E('small', {}, [ present(client.ap || client.node_label) ])
		]),
		E('td', {}, [
			badge(client.severity === 'critical' ? 'critical' : 'warn',
				present(client.state,
					client.severity === 'critical' ? 'Critique' : 'Dégradé'))
		]),
		E('td', {}, [
			present(client.band, '?') + ' GHz · ' +
			present(client.standard_label || client.standard)
		]),
		E('td', {}, [
			oneDecimal(client.signal_dbm, ' dBm') + ' · SNR ' +
			oneDecimal(client.snr_db, ' dB')
		]),
		E('td', {}, [
			oneDecimal(client.tx_mbps, '') + ' / ' +
			oneDecimal(client.rx_mbps, '') + ' Mbit/s'
		]),
		E('td', {}, [ list(client.reasons).slice(0, 2).join(' · ') || '—' ])
	]));

	return E('div', { 'class': 'otb-summary-block' }, [
		E('h4', {}, [ 'Liaisons Wi-Fi prioritaires à examiner' ]),
		E('table', { 'class': 'table otb-summary-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', {}, [ 'Client / AP' ]),
				E('th', {}, [ 'Lien' ]),
				E('th', {}, [ 'Bande / standard' ]),
				E('th', {}, [ 'Signal' ]),
				E('th', {}, [ 'TX / RX PHY' ]),
				E('th', {}, [ 'Motif' ])
			])
		].concat(rows)),
		E('p', { 'class': 'otb-summary-note' }, [
			'Les détails complets, le NSS/MIMO, la largeur et le roaming restent ' +
			'disponibles dans « Clients OTB ».'
		])
	]);
}

function renderSupervision(overview) {
	let supervision = overview.supervision || {};
	let devices = list(supervision.devices).slice().sort((a, b) =>
		String(a.group || '').localeCompare(String(b.group || ''), 'fr') ||
		String(a.name || '').localeCompare(String(b.name || ''), 'fr')
	);
	let rows = devices.map(device => E('tr', { 'class': 'tr' }, [
		E('td', {}, [ present(device.group) ]),
		E('td', {}, [
			device.online ?
				E('a', {
					'href': 'http://' + device.ip + '/',
					'target': '_blank',
					'rel': 'noopener noreferrer'
				}, [ E('strong', {}, [ present(device.name) ]) ]) :
				E('strong', {}, [ present(device.name) ]),
			E('br'),
			E('small', {}, [ present(device.role) ])
		]),
		E('td', {}, [
			badge(device.online ? 'ok' :
				(device.planned ? 'neutral' : 'critical'),
				device.online ? 'En ligne' :
					(device.planned ? 'Prévu' : 'Hors ligne'))
		]),
		E('td', {}, [ present(device.ip) ]),
		E('td', {}, [
			device.latency_ms != null ?
				oneDecimal(device.latency_ms, ' ms') : '—'
		]),
		E('td', {}, [ present(device.source) ])
	]));

	return E('div', { 'class': 'otb-summary-block' }, [
		E('h4', {}, [
			'Supervision IP nommée — ' + present(supervision.scope_label)
		]),
		E('p', { 'class': 'otb-summary-note' }, [
			'Les équipements marqués « Prévu » ne sont pas comptés comme une panne. ' +
			'Le R4 Pro ajoute automatiquement toutes les réservations DHCP statiques ; ' +
			'les autres nœuds se limitent aux R4 et aux deux switches.'
		]),
		E('div', { 'class': 'otb-summary-table-wrap' }, [
			E('table', { 'class': 'table otb-summary-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', {}, [ 'Groupe' ]),
					E('th', {}, [ 'Équipement' ]),
					E('th', {}, [ 'État' ]),
					E('th', {}, [ 'IP' ]),
					E('th', {}, [ 'Latence' ]),
					E('th', {}, [ 'Source' ])
				])
			].concat(rows))
		])
	]);
}

function renderAll(data) {
	let overview = data[0] || {};
	let ports = data[1] || { ports: [], bonds: [] };
	let telemetry = data[2] || {};
	let clients = data[3] || {};
	let health = systemHealth(telemetry);
	let bonds = bondState(overview, ports);
	let optics = opticalState(telemetry);
	let overall = overallState(overview, telemetry, bonds);
	let cards = [
		health.card,
		bonds.card
	];

	if (overview.role === 'r4pro')
		cards.push(wanCard(overview));
	if (/r4/.test(overview.role || ''))
		cards.push(wifiCard(overview));
	if (overview.role === 'r4sud')
		cards.push(servicesAndStorage(overview));
	cards.push(optics.card);
	if (list(clients.nodes).length || number((clients.summary || {}).wifi))
		cards.push(clientsCard(clients));
	cards.push(supervisionCard(overview));

	let system = telemetry.system || {};
	let blocks = [
		E('style', {}, [ `
.otb-summary-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1rem;border:1px solid rgba(127,127,127,.28);border-left:5px solid #1b7f3a;border-radius:.65rem;background:rgba(127,127,127,.045);margin-bottom:.85rem}
.otb-summary-header.warn{border-left-color:#d87900}.otb-summary-header.critical{border-left-color:#b42318}.otb-summary-title{font-size:1.25rem;font-weight:750;line-height:1.25}.otb-summary-subtitle{margin-top:.28rem;color:var(--text-color-medium,#666);font-size:.84rem}
.otb-summary-badge{display:inline-flex;align-items:center;gap:.35rem;white-space:nowrap;border-radius:999px;padding:.19rem .52rem;font-size:.72rem;font-weight:750;background:rgba(127,127,127,.13)}
.otb-summary-badge.ok{color:#176b32;background:#e1f4e6}.otb-summary-badge.warn{color:#8a4b00;background:#fff0d8}.otb-summary-badge.critical{color:#9f1d17;background:#fde4e1}.otb-summary-badge.neutral{color:#52606d;background:#edf0f2}
.otb-summary-dot{display:inline-block;width:.52rem;height:.52rem;border-radius:50%;background:currentColor}
.otb-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:.72rem;margin:.75rem 0 1rem}
.otb-summary-card{min-width:0;border:1px solid rgba(127,127,127,.26);border-top:4px solid #16823b;border-radius:.58rem;padding:.72rem;background:rgba(127,127,127,.025)}
.otb-summary-card.warn{border-top-color:#d87900}.otb-summary-card.critical{border-top-color:#b42318}.otb-summary-card.neutral{border-top-color:#87909a}
.otb-summary-card-title{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.02em}
.otb-summary-card-headline{margin:.58rem 0 .36rem;font-size:1.03rem;font-weight:750}.otb-summary-card-line{font-size:.79rem;line-height:1.42;margin-top:.16rem;color:var(--text-color-medium,#555)}
.otb-summary-card-link{display:inline-block;margin-top:.58rem;font-size:.76rem;font-weight:700}.otb-summary-block{margin:1.08rem 0}.otb-summary-block h4{margin:.15rem 0 .55rem}
.otb-summary-note{font-size:.77rem;color:var(--text-color-medium,#666);margin:.35rem 0 .65rem}.otb-summary-table-wrap{overflow-x:auto}
.otb-summary-table td,.otb-summary-table th{vertical-align:middle}.otb-summary-table td{font-size:.78rem}.otb-summary-table small{color:var(--text-color-medium,#666)}
.otb-summary-preserved{padding:.58rem .7rem;border-radius:.45rem;background:rgba(34,113,177,.09);font-size:.79rem;margin:.75rem 0}
@media(max-width:700px){.otb-summary-header{flex-direction:column}.otb-summary-grid{grid-template-columns:1fr}.otb-summary-table{min-width:700px}}
` ]),
		E('div', { 'class': 'otb-summary-header ' + overall.level }, [
			E('div', {}, [
				E('div', { 'class': 'otb-summary-title' }, [
					'Synthèse OTB — ' + present(overview.role_label)
				]),
				E('div', { 'class': 'otb-summary-subtitle' }, [
					present(system.hostname || overview.hostname) + ' · ' +
					present(system.model || overview.model) + ' · ' +
					'relevé ' + (overview.stale ? 'périmé' :
						'il y a ' + Math.max(0, Math.round(number(overview.age_s) || 0)) +
						' s')
				]),
				overall.reasons.length ?
					E('div', { 'class': 'otb-summary-subtitle' }, [
						'À traiter : ' + overall.reasons.slice(0, 4).join(' · ')
					]) : ''
			]),
			badge(overall.level, overall.label)
		]),
		E('div', { 'class': 'otb-summary-grid' }, cards),
		E('div', { 'class': 'otb-summary-preserved' }, [
			E('strong', {}, [ 'Vue physique conservée : ' ]),
			'le panneau constructeur « État réel des ports et VLAN » reste affiché ' +
			'ci-dessous avec chaque port, son lien, sa vitesse, son LACP et ses VLAN ' +
			'directs ou hérités.'
		])
	];

	for (let block of [
		renderWanTable(overview),
		renderBondTable(bonds),
		renderOpticalTable(optics),
		renderWifiProblems(clients),
		renderSupervision(overview)
	]) {
		if (block)
			blocks.push(block);
	}

	return E('div', { 'class': 'otb-summary-root' }, blocks);
}

return baseclass.extend({
	title: 'Synthèse OTB',

	load() {
		return Promise.all([
			L.resolveDefault(callOverview(), {}),
			L.resolveDefault(callPorts(), { ports: [], bonds: [] }),
			L.resolveDefault(callTelemetry(), {
				system: {},
				thermal_zones: [],
				optical_modules: []
			}),
			L.resolveDefault(callClients(), {
				nodes: [],
				wifi: [],
				ethernet: [],
				summary: {}
			})
		]);
	},

	render(data) {
		return renderAll(data || [{}, {}, {}, {}]);
	}
});
