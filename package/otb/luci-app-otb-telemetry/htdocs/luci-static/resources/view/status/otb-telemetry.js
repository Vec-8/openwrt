'use strict';
'require view';
'require rpc';
'require poll';
'require dom';

var callStatus = rpc.declare({
	object: 'luci.otb_telemetry',
	method: 'status',
	expect: { '': {} }
});

var callHistory = rpc.declare({
	object: 'luci.otb_telemetry',
	method: 'history',
	expect: { '': { samples: [] } }
});

function fixed(value, digits) {
	if (value == null || isNaN(Number(value)))
		return 'N/D';
	return Number(value).toFixed(digits == null ? 1 : digits);
}

function clamp(value, minimum, maximum) {
	return Math.max(minimum, Math.min(maximum, value));
}

function severityColor(severity) {
	switch (severity) {
	case 'critical': return '#b3261e';
	case 'warning': return '#d87900';
	case 'offline': return '#707070';
	default: return '#16823b';
	}
}

function severityLabel(severity) {
	switch (severity) {
	case 'critical': return 'Critique';
	case 'warning': return 'Dégradé';
	case 'offline': return 'Inactif';
	default: return 'Normal';
	}
}

function badge(severity, label) {
	return E('span', {
		'style': 'display:inline-block;padding:.18rem .5rem;border-radius:999px;' +
			'font-weight:700;color:#fff;background:' + severityColor(severity)
	}, [ label || severityLabel(severity) ]);
}

function temperatureSeverity(value, warning, critical) {
	if (value == null)
		return 'offline';
	if (critical != null && value >= critical)
		return 'critical';
	if (warning != null && value >= warning)
		return 'warning';
	return 'ok';
}

function temperature(value, warning, critical) {
	if (value == null)
		return E('span', {}, [ 'N/D' ]);

	var severity = temperatureSeverity(value, warning, critical);
	return E('span', {
		'style': 'font-weight:700;color:' + severityColor(severity)
	}, [ fixed(value, 1) + ' °C' ]);
}

function card(title, value, detail, severity) {
	return E('div', {
		'style': 'flex:1 1 12rem;min-width:12rem;padding:.8rem 1rem;' +
			'border:1px solid #d8d8d8;border-left:5px solid ' +
			severityColor(severity || 'ok') + ';border-radius:6px;background:var(--background-color-high,#fff)'
	}, [
		E('div', { 'style': 'font-size:.82rem;color:#666' }, [ title ]),
		E('div', { 'style': 'font-size:1.25rem;font-weight:700;margin:.2rem 0' }, [ value ]),
		E('div', { 'style': 'font-size:.82rem;color:#666' }, [ detail || '' ])
	]);
}

function metricText(metric, digits) {
	if (!metric || metric.value == null)
		return 'N/D';
	return fixed(metric.value, digits == null ? 2 : digits) + ' ' + (metric.unit || '');
}

function thresholdText(metric) {
	if (!metric)
		return 'N/D';

	var values = [];
	if (metric.low_alarm != null)
		values.push('alarme basse ' + fixed(metric.low_alarm, 2));
	if (metric.low_warning != null)
		values.push('avert. bas ' + fixed(metric.low_warning, 2));
	if (metric.high_warning != null)
		values.push('avert. haut ' + fixed(metric.high_warning, 2));
	if (metric.high_alarm != null)
		values.push('alarme haute ' + fixed(metric.high_alarm, 2));

	return values.length ? values.join(' · ') + ' ' + (metric.unit || '') : 'Non fourni';
}

function metricMargin(metric) {
	if (!metric || metric.margin_to_warning == null)
		return 'N/D';
	return fixed(metric.margin_to_warning, 2) + ' ' + (metric.unit || '');
}

function systemCards(data) {
	var system = data.system || {};
	var zones = data.thermal_zones || [];
	var optics = (data.optical_modules || []).filter(function(module) {
		return module.dom_supported && module.temperature && module.temperature.value != null;
	});
	var sensors = data.hardware_temperatures || [];
	var soc = zones.length ? zones[0] : null;
	var maxOptic = null;
	var maxSensor = null;

	optics.forEach(function(module) {
		if (!maxOptic || module.temperature.value > maxOptic.temperature.value)
			maxOptic = module;
	});
	sensors.forEach(function(sensor) {
		if (!maxSensor || sensor.temperature_c > maxSensor.temperature_c)
			maxSensor = sensor;
	});

	var fan = data.fan || {};
	var fanValue;
	var fanDetail;
	var fanSeverity = 'ok';
	if (!fan.detected) {
		fanValue = 'Passif';
		fanDetail = 'Aucun PWM, ventilateur ou tachymètre détecté';
	}
	else {
		var controller = (fan.controllers || [])[0] || {};
		fanValue = controller.pwm != null
			? 'PWM ' + fixed(controller.pwm, 0) + '/255'
			: 'Ventilateur détecté';
		fanDetail = controller.pwm_percent != null
			? fixed(controller.pwm_percent, 0) + ' % commandé'
			: 'Commande PWM non lisible';
		fanDetail += fan.tachometer_available
			? ' · ' + fixed(controller.rpm, 0) + ' tr/min'
			: ' · vitesse réelle non mesurée';
		/*
		 * L'absence de tachymètre est une limite matérielle connue des R4,
		 * pas une panne tant que la commande PWM reste lisible.
		 */
		if (controller.pwm == null)
			fanSeverity = 'warning';
	}

	var memory = system.memory || {};
	var load = system.load || {};
	var cards = [
		card(
			'SoC',
			soc ? fixed(soc.temperature_c, 1) + ' °C' : 'N/D',
			soc ? 'Avertissement opérationnel 70 °C' : 'Capteur absent',
			soc ? temperatureSeverity(soc.temperature_c, 70, 85) : 'offline'
		),
		card(
			'Optique la plus chaude',
			maxOptic ? fixed(maxOptic.temperature.value, 1) + ' °C' : 'N/D',
			maxOptic
				? maxOptic.interface + ' · marge ' + metricMargin(maxOptic.temperature)
				: 'Aucun DDM thermique',
			maxOptic
				? temperatureSeverity(
					maxOptic.temperature.value,
					maxOptic.temperature.high_warning,
					maxOptic.temperature.high_alarm
				)
				: 'offline'
		),
		card(
			'Autre capteur le plus chaud',
			maxSensor ? fixed(maxSensor.temperature_c, 1) + ' °C' : 'N/D',
			maxSensor ? maxSensor.label : 'Aucun capteur supplémentaire',
			maxSensor
				? temperatureSeverity(maxSensor.temperature_c, 70, 85)
				: 'offline'
		),
		card('Refroidissement', fanValue, fanDetail, fanSeverity),
		card(
			'Mémoire',
			memory.used_percent != null ? fixed(memory.used_percent, 1) + ' %' : 'N/D',
			memory.available_mib != null
				? fixed(memory.available_mib, 0) + ' Mio disponibles'
				: '',
			memory.used_percent >= 80 ? 'warning' : 'ok'
		),
		card(
			'Charge',
			load.load_1 != null ? fixed(load.load_1, 2) : 'N/D',
			'1 min · noyau ' + (system.kernel || 'inconnu'),
			load.load_1 != null && load.load_1 >= 3 ? 'warning' : 'ok'
		)
	];

	return E('div', {
		'style': 'display:flex;flex-wrap:wrap;gap:.65rem;margin:1rem 0'
	}, cards);
}

function thermalTable(zones) {
	if (!zones.length)
		return E('div', { 'class': 'alert-message warning' }, [
			'Aucune zone thermique exposée par le noyau.'
		]);

	return E('div', { 'class': 'table' }, [
		E('div', { 'class': 'tr table-titles' }, [
			E('div', { 'class': 'th' }, [ 'Zone' ]),
			E('div', { 'class': 'th' }, [ 'Température' ]),
			E('div', { 'class': 'th' }, [ 'Seuils noyau' ]),
			E('div', { 'class': 'th' }, [ 'État opérationnel' ])
		])
	].concat(zones.map(function(zone) {
		var trips = (zone.trips || []).map(function(trip) {
			return trip.type + ' ' + fixed(trip.temperature_c, 0) + ' °C';
		}).join(' · ');
		var severity = temperatureSeverity(
			zone.temperature_c,
			zone.operational_warning_c,
			zone.operational_critical_c
		);

		return E('div', { 'class': 'tr' }, [
			E('div', { 'class': 'td' }, [ zone.label || zone.id ]),
			E('div', { 'class': 'td' }, [
				temperature(
					zone.temperature_c,
					zone.operational_warning_c,
					zone.operational_critical_c
				)
			]),
			E('div', { 'class': 'td' }, [ trips || 'Aucun seuil déclaré' ]),
			E('div', { 'class': 'td' }, [ badge(severity) ])
		]);
	})));
}

function hardwareTable(sensors) {
	if (!sensors.length)
		return E('p', {}, [ 'Aucun capteur matériel supplémentaire.' ]);

	return E('div', { 'class': 'table' }, [
		E('div', { 'class': 'tr table-titles' }, [
			E('div', { 'class': 'th' }, [ 'Capteur' ]),
			E('div', { 'class': 'th' }, [ 'Catégorie' ]),
			E('div', { 'class': 'th' }, [ 'Température' ]),
			E('div', { 'class': 'th' }, [ 'Limites matérielles brutes' ]),
			E('div', { 'class': 'th' }, [ 'État' ])
		])
	].concat(sensors.map(function(sensor) {
		var severity = temperatureSeverity(
			sensor.temperature_c,
			sensor.operational_warning_c,
			sensor.operational_critical_c
		);
		var limits = [];
		if (sensor.native_max_c != null)
			limits.push('max ' + fixed(sensor.native_max_c, 0) + ' °C');
		if (sensor.native_critical_c != null)
			limits.push('critique ' + fixed(sensor.native_critical_c, 0) + ' °C');

		return E('div', { 'class': 'tr' }, [
			E('div', { 'class': 'td' }, [ sensor.label ]),
			E('div', { 'class': 'td' }, [ sensor.category ]),
			E('div', { 'class': 'td' }, [
				temperature(
					sensor.temperature_c,
					sensor.operational_warning_c,
					sensor.operational_critical_c
				)
			]),
			E('div', { 'class': 'td' }, [ limits.join(' · ') || 'Non fournies' ]),
			E('div', { 'class': 'td' }, [ badge(severity) ])
		]);
	})));
}

function coolingTable(data) {
	var devices = data.cooling_devices || [];
	var frequencies = data.cpu_frequencies || [];
	var fan = data.fan || {};
	var rows = [];

	(fan.controllers || []).forEach(function(controller) {
		rows.push([
			'Ventilateur ' + controller.name,
			controller.pwm != null
				? 'PWM ' + fixed(controller.pwm, 0) + '/255 (' +
					fixed(controller.pwm_percent, 0) + ' %)'
				: 'PWM indisponible',
			controller.rpm != null
				? fixed(controller.rpm, 0) + ' tr/min'
				: 'Pas de tachymètre'
		]);
	});
	devices.forEach(function(device) {
		rows.push([
			'Cooling device ' + device.type,
			'État ' + fixed(device.current_state, 0) + '/' + fixed(device.max_state, 0),
			device.id
		]);
	});
	frequencies.forEach(function(policy) {
		var range = policy.min_khz != null && policy.max_khz != null
			? fixed(policy.min_khz / 1000000, 2) + '–' +
				fixed(policy.max_khz / 1000000, 2) + ' GHz'
			: 'plage N/D';
		rows.push([
			'CPU ' + policy.name,
			policy.current_khz != null
				? fixed(policy.current_khz / 1000000, 2) + ' GHz'
				: 'Fréquence N/D',
			(policy.governor || 'gouverneur inconnu') + ' · ' + range
		]);
	});

	if (!rows.length)
		return E('p', {}, [
			'Aucun ventilateur, cooling-device ou contrôle de fréquence exposé.'
		]);

	return E('div', { 'class': 'table' }, [
		E('div', { 'class': 'tr table-titles' }, [
			E('div', { 'class': 'th' }, [ 'Élément' ]),
			E('div', { 'class': 'th' }, [ 'État' ]),
			E('div', { 'class': 'th' }, [ 'Détail' ])
		])
	].concat(rows.map(function(row) {
		return E('div', { 'class': 'tr' }, row.map(function(value) {
			return E('div', { 'class': 'td' }, [ value ]);
		}));
	})));
}

function opticalDetails(module) {
	var metrics = [
		[ 'Température', module.temperature ],
		[ 'Tension du module', module.voltage ],
		[ 'Courant laser', module.bias ],
		[ 'Puissance TX', module.tx ],
		[ 'Puissance RX', module.rx ]
	];
	var activeFlags = (module.flags || []).filter(function(flag) { return flag.active; });

	return E('details', {}, [
		E('summary', { 'style': 'cursor:pointer' }, [
			(module.vendor || 'Constructeur inconnu') + ' · ' +
			(module.part_number || 'référence inconnue')
		]),
		E('div', { 'style': 'margin:.6rem 0' }, [
			E('p', {}, [
				'Série : ' + (module.serial || 'N/D') +
				' · longueur d’onde : ' +
				(module.wavelength_nm != null ? fixed(module.wavelength_nm, 0) + ' nm' : 'N/D')
			]),
			E('div', { 'class': 'table' }, [
				E('div', { 'class': 'tr table-titles' }, [
					E('div', { 'class': 'th' }, [ 'Mesure' ]),
					E('div', { 'class': 'th' }, [ 'Valeur' ]),
					E('div', { 'class': 'th' }, [ 'Marge avant avertissement' ]),
					E('div', { 'class': 'th' }, [ 'Seuils DDM bruts' ])
				])
			].concat(metrics.map(function(row) {
				return E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td' }, [ row[0] ]),
					E('div', { 'class': 'td' }, [ metricText(row[1], 2) ]),
					E('div', { 'class': 'td' }, [ metricMargin(row[1]) ]),
					E('div', { 'class': 'td' }, [ thresholdText(row[1]) ])
				]);
			}))),
			E('p', {}, [
				activeFlags.length
					? 'Drapeaux actifs : ' + activeFlags.map(function(flag) {
						return flag.name;
					}).join(' · ')
					: 'Drapeaux DDM actifs : aucun'
			])
		])
	]);
}

function opticalTable(modules) {
	if (!modules.length)
		return E('div', { 'class': 'alert-message warning' }, [
			'Aucune cage SFP connue pour ce modèle.'
		]);

	return E('div', {}, [
		E('div', { 'class': 'alert-message notice' }, [
			'La tension indiquée est la tension interne du module optique, jamais la VCC générale de la carte.'
		]),
		E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr table-titles' }, [
				E('div', { 'class': 'th' }, [ 'Port' ]),
				E('div', { 'class': 'th' }, [ 'Lien' ]),
				E('div', { 'class': 'th' }, [ 'Module' ]),
				E('div', { 'class': 'th' }, [ 'Température' ]),
				E('div', { 'class': 'th' }, [ 'VCC module' ]),
				E('div', { 'class': 'th' }, [ 'TX / RX' ]),
				E('div', { 'class': 'th' }, [ 'État DDM' ])
			])
		].concat(modules.map(function(module) {
			var temperatureCell = module.dom_supported
				? temperature(
					module.temperature.value,
					module.temperature.high_warning,
					module.temperature.high_alarm
				)
				: E('span', {}, [ 'N/D' ]);

			return E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td' }, [ module.interface ]),
				E('div', { 'class': 'td' }, [ module.link ]),
				E('div', { 'class': 'td' }, [
					module.eeprom_detected
						? opticalDetails(module)
						: 'EEPROM/DDM indisponible'
				]),
				E('div', { 'class': 'td' }, [ temperatureCell ]),
				E('div', { 'class': 'td' }, [ metricText(module.voltage, 3) ]),
				E('div', { 'class': 'td' }, [
					metricText(module.tx, 2) + ' / ' + metricText(module.rx, 2)
				]),
				E('div', { 'class': 'td' }, [
					badge(module.severity),
					E('div', { 'style': 'font-size:.78rem;margin-top:.25rem' }, [
						module.reason
					])
				])
			]);
		})))
	]);
}

function sparkline(values, color) {
	var width = 220;
	var height = 42;
	var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
	svg.setAttribute('width', '220');
	svg.setAttribute('height', '42');
	svg.setAttribute('role', 'img');

	if (!values.length)
		return svg;

	var minimum = Math.min.apply(null, values);
	var maximum = Math.max.apply(null, values);
	if (maximum - minimum < 1) {
		maximum += .5;
		minimum -= .5;
	}

	var points = values.map(function(value, index) {
		var x = values.length == 1 ? width / 2 : index * width / (values.length - 1);
		var y = height - 3 - (value - minimum) * (height - 6) / (maximum - minimum);
		return fixed(x, 1) + ',' + fixed(clamp(y, 2, height - 2), 1);
	}).join(' ');

	var line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
	line.setAttribute('points', points);
	line.setAttribute('fill', 'none');
	line.setAttribute('stroke', color || '#16823b');
	line.setAttribute('stroke-width', '2');
	line.setAttribute('vector-effect', 'non-scaling-stroke');
	svg.appendChild(line);
	return svg;
}

function historyTable(history) {
	var samples = history.samples || [];
	if (!samples.length)
		return E('div', { 'class': 'alert-message notice' }, [
			'L’historique RAM démarre maintenant. Une mesure est conservée toutes les 5 minutes pendant 24 heures.'
		]);

	var series = {};
	samples.forEach(function(sample) {
		(sample.temperatures || []).forEach(function(sensor) {
			if (sensor.value_c == null)
				return;
			if (!series[sensor.id]) {
				series[sensor.id] = {
					label: sensor.label,
					category: sensor.category,
					values: []
				};
			}
			series[sensor.id].values.push(Number(sensor.value_c));
		});
	});

	var rows = Object.keys(series).sort().map(function(id) {
		var item = series[id];
		var values = item.values;
		var last = values[values.length - 1];
		var minimum = Math.min.apply(null, values);
		var maximum = Math.max.apply(null, values);
		var severity = temperatureSeverity(last, 70, 85);

		return E('div', { 'class': 'tr' }, [
			E('div', { 'class': 'td' }, [ item.label ]),
			E('div', { 'class': 'td' }, [ item.category ]),
			E('div', { 'class': 'td' }, [ temperature(last, 70, 85) ]),
			E('div', { 'class': 'td' }, [
				fixed(minimum, 1) + ' / ' + fixed(maximum, 1) + ' °C'
			]),
			E('div', { 'class': 'td' }, [ sparkline(values, severityColor(severity)) ])
		]);
	});

	return E('div', {}, [
		E('div', { 'class': 'alert-message notice' }, [
			'Historique volatil en RAM : aucune écriture flash, remise à zéro au redémarrage.'
		]),
		E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr table-titles' }, [
				E('div', { 'class': 'th' }, [ 'Capteur' ]),
				E('div', { 'class': 'th' }, [ 'Catégorie' ]),
				E('div', { 'class': 'th' }, [ 'Dernière mesure' ]),
				E('div', { 'class': 'th' }, [ 'Minimum / maximum' ]),
				E('div', { 'class': 'th' }, [ 'Tendance' ])
			])
		].concat(rows))
	]);
}

function statusContent(data) {
	var system = data.system || {};
	return E('div', {}, [
		E('h2', {}, [ 'Télémétrie matérielle OTB' ]),
		E('p', {}, [
			(system.hostname || 'OpenWrt') + ' · ' +
			(system.model || 'modèle inconnu') + ' · lecture seule'
		]),
		systemCards(data),
		E('h3', {}, [ 'Zones thermiques' ]),
		thermalTable(data.thermal_zones || []),
		E('h3', {}, [ 'Capteurs matériels supplémentaires' ]),
		hardwareTable(data.hardware_temperatures || []),
		E('h3', {}, [ 'Refroidissement et fréquence CPU' ]),
		coolingTable(data),
		E('h3', {}, [ 'Modules SFP/SFP+' ]),
		opticalTable(data.optical_modules || [])
	]);
}

return view.extend({
	load: function() {
		return Promise.all([ callStatus(), callHistory() ]);
	},

	render: function(data) {
		var statusNode = E('div', {}, [ statusContent(data[0] || {}) ]);
		var historyNode = E('div', {}, [
			E('h3', {}, [ 'Historique thermique sur 24 heures' ]),
			historyTable(data[1] || { samples: [] })
		]);

		poll.add(function() {
			return Promise.all([ callStatus(), callHistory() ]).then(function(values) {
				dom.content(statusNode, [ statusContent(values[0] || {}) ]);
				dom.content(historyNode, [
					E('h3', {}, [ 'Historique thermique sur 24 heures' ]),
					historyTable(values[1] || { samples: [] })
				]);
			});
		/*
		 * Le statut lit l'EEPROM/DDM de chaque optique. Trente secondes
		 * évitent de solliciter inutilement les bus I2C/MDIO du switch.
		 */
		}, 30);

		return E('div', {}, [ statusNode, historyNode ]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
