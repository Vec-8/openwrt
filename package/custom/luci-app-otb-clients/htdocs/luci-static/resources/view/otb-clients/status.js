'use strict';
'require view';
'require poll';
'require rpc';
'require ui';
'require dom';

const callGetStatus = rpc.declare({
	object: 'luci.otb-clients',
	method: 'getStatus',
	expect: {}
});

function valueOrDash(value, suffix) {
	if (value == null || value === '')
		return '—';
	return String(value) + (suffix || '');
}

function formatNumber(value, digits) {
	if (value == null || Number.isNaN(Number(value)))
		return '—';
	return Number(value).toFixed(digits == null ? 0 : digits);
}

function formatRate(value) {
	if (value == null || Number.isNaN(Number(value)))
		return '—';
	return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' Mbit/s';
}

function formatSpeed(value) {
	if (value == null || Number.isNaN(Number(value)))
		return '—';
	value = Number(value);
	return value >= 1000 ? (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' Gbit/s' : value + ' Mbit/s';
}

function formatDuration(seconds) {
	seconds = Number(seconds);
	if (!Number.isFinite(seconds) || seconds < 0)
		return '—';

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (days)
		return '%d j %d h'.format(days, hours);
	if (hours)
		return '%d h %d min'.format(hours, minutes);
	if (minutes)
		return '%d min'.format(minutes);
	return '%d s'.format(Math.floor(seconds));
}

function formatDate(epoch) {
	if (!epoch)
		return '—';
	return new Date(Number(epoch) * 1000).toLocaleString();
}

function bandLabel(band) {
	if (band === '2.4')
		return '2,4 GHz';
	if (band === '5')
		return '5 GHz';
	if (band === '6')
		return '6 GHz';
	return '—';
}

function mimoLabel(client) {
	const tx = client.nss_tx;
	const rx = client.nss_rx;
	if (tx == null && rx == null)
		return '—';
	if (tx != null && rx != null && Number(tx) === Number(rx))
		return '%dx%d'.format(Number(tx), Number(rx));
	return '%s/%s'.format(tx == null ? '—' : tx, rx == null ? '—' : rx);
}

function severityClass(client) {
	if (client.stale)
		return 'otb-state-stale';
	return 'otb-state-' + (client.severity || 'unknown');
}

function stateBadge(client) {
	const state = client.stale ? _('Périmé') : (client.state || _('Inconnu'));
	return E('span', { 'class': 'otb-state ' + severityClass(client) }, [
		E('span', { 'class': 'otb-dot', 'aria-hidden': 'true' }),
		E('strong', {}, [ state ])
	]);
}

function identityCell(client) {
	const name = client.display_name || client.hostname || _('Client sans nom');
	const details = [];
	if (client.ip)
		details.push(client.ip);
	details.push(client.mac || '—');

	return E('div', { 'class': 'otb-client-id' }, [
		E('strong', {}, [ name ]),
		E('small', {}, [ details.join(' · ') ])
	]);
}

function reasonsBlock(client) {
	const reasons = client.reasons || [];
	if (!reasons.length)
		return E('small', { 'class': 'otb-reasons ok' }, [ _('Aucune anomalie détectée') ]);
	return E('small', { 'class': 'otb-reasons' }, [ reasons.join(' · ') ]);
}

function linkCell(client) {
	if (client.type === 'ethernet') {
		return E('div', { 'class': 'otb-link-summary' }, [
			stateBadge(client),
			E('strong', {}, [ '%s · %s'.format(formatSpeed(client.speed_mbps), client.duplex || '—') ]),
			E('span', {}, [ '%s · %s'.format(client.port || '—', client.node_label || '—') ]),
			reasonsBlock(client)
		]);
	}

	const mode = [ bandLabel(client.band), client.standard || '—', client.width_mhz ? client.width_mhz + ' MHz' : '—', mimoLabel(client) ].join(' · ');
	const signal = '%s dBm · SNR %s dB'.format(valueOrDash(client.signal_dbm), valueOrDash(client.snr_db));
	const rates = 'TX %s / RX %s'.format(formatRate(client.tx_mbps), formatRate(client.rx_mbps));

	return E('div', { 'class': 'otb-link-summary' }, [
		stateBadge(client),
		E('strong', {}, [ mode ]),
		E('span', {}, [ signal ]),
		E('span', {}, [ rates ]),
		E('span', {}, [ client.node_label || '—' ]),
		reasonsBlock(client)
	]);
}

function roamingCell(client) {
	const event = client.last_roaming;
	if (!event)
		return E('span', {}, [ _('Aucun roaming observé') ]);

	return E('div', {}, [
		E('strong', {}, [ '%s → %s'.format(event.from_label || event.from_node || '—', event.to_label || event.to_node || '—') ]),
		E('br'),
		E('small', {}, [ formatDate(event.timestamp) ]),
		client.roams_last_hour ? E('small', { 'class': 'otb-block' }, [ _('%d roaming(s) sur une heure').format(client.roams_last_hour) ]) : ''
	]);
}

function detailRows(client) {
	if (client.type === 'ethernet') {
		return [
			_('Type'), 'Ethernet',
			_('Nœud'), client.node_label || '—',
			_('Port'), client.port || '—',
			_('Nom physique'), client.phys_port || '—',
			_('VLAN'), valueOrDash(client.vlan),
			_('Vitesse négociée'), formatSpeed(client.speed_mbps),
			_('Vitesse attendue'), formatSpeed(client.expected_speed_mbps),
			_('Vitesse maximale annoncée'), formatSpeed(client.max_speed_mbps),
			_('Duplex'), client.duplex || '—',
			_('Carrier'), client.carrier ? _('actif') : _('inactif'),
			_('État'), client.state || '—',
			_('Causes'), (client.reasons || []).join(' · ') || _('aucune'),
			_('Adresse MAC'), client.mac || '—',
			_('Adresse IP'), client.ip || '—'
		];
	}

	return [
		_('Point d’accès'), client.node_label || '—',
		_('Interface'), client.interface || '—',
		_('Radio'), client.radio || '—',
		_('Bande'), bandLabel(client.band),
		_('SSID'), client.ssid || '—',
		_('VLAN'), valueOrDash(client.vlan),
		_('Canal'), valueOrDash(client.channel),
		_('Fréquence'), valueOrDash(client.frequency_mhz, ' MHz'),
		_('Largeur réellement observée'), valueOrDash(client.width_mhz, ' MHz'),
		_('Standard négocié'), client.standard_label || client.standard || '—',
		_('NSS TX / RX'), mimoLabel(client),
		_('Signal'), valueOrDash(client.signal_dbm, ' dBm'),
		_('Signal moyen'), valueOrDash(client.signal_avg_dbm, ' dBm'),
		_('Chaînes signal'), (client.chain_signal_dbm || []).join(', ') || '—',
		_('Bruit'), valueOrDash(client.noise_dbm, ' dBm'),
		_('SNR'), valueOrDash(client.snr_db, ' dB'),
		_('TX PHY'), formatRate(client.tx_mbps),
		_('RX PHY'), formatRate(client.rx_mbps),
		_('TX brut'), client.tx_rate_raw || '—',
		_('RX brut'), client.rx_rate_raw || '—',
		_('Retries TX'), client.retry_pct == null ? _('échantillon en attente') : formatNumber(client.retry_pct, 1) + ' %',
		_('Compteur retries TX'), valueOrDash(client.tx_retries),
		_('Échecs TX récents'), valueOrDash(client.tx_failed_delta),
		_('Compteur échecs TX'), valueOrDash(client.tx_failed),
		_('Temps associé'), formatDuration(client.connected_seconds),
		_('Inactivité'), valueOrDash(client.inactive_ms, ' ms'),
		_('Dernier roaming'), client.last_roaming ? formatDate(client.last_roaming.timestamp) : '—',
		_('État synthétique'), client.state || '—',
		_('Score'), valueOrDash(client.score, '/100'),
		_('Causes'), (client.reasons || []).join(' · ') || _('aucune'),
		_('Adresse MAC'), client.mac || '—',
		_('Adresse IP'), client.ip || '—'
	];
}

function showDetails(client, history) {
	const events = (history || []).filter(e => String(e.mac || '').toLowerCase() === String(client.mac || '').toLowerCase()).slice(-20).reverse();
	const body = [
		stateBadge(client),
		ui.itemlist(E('div', { 'class': 'otb-details' }), detailRows(client))
	];

	if (events.length) {
		body.push(E('h4', {}, [ _('Historique de roaming') ]));
		body.push(E('ul', { 'class': 'otb-history' }, events.map(event => E('li', {}, [
			'%s — %s → %s (%s → %s)'.format(
				formatDate(event.timestamp),
				event.from_label || event.from_node || '—',
				event.to_label || event.to_node || '—',
				event.from_interface || '—',
				event.to_interface || '—')
		]))));
	}

	body.push(E('details', {}, [
		E('summary', {}, [ _('Données JSON brutes') ]),
		E('pre', { 'class': 'otb-json' }, [ JSON.stringify(client, null, 2) ])
	]));
	body.push(E('div', { 'class': 'right' }, [
		E('button', { 'class': 'btn', 'click': ui.hideModal }, [ _('Fermer') ])
	]));

	ui.showModal(client.display_name || client.hostname || client.mac || _('Détail client'), body);
}

function nodeCards(nodes) {
	return E('div', { 'class': 'otb-node-grid' }, (nodes || []).map(node => {
		let css = node.online ? 'online' : (node.enabled ? 'offline' : 'disabled');
		let state = node.online ? _('En ligne') : (node.enabled ? _('Hors ligne') : _('Non configuré'));
		return E('div', { 'class': 'otb-node-card ' + css }, [
			E('strong', {}, [ node.label || node.id ]),
			E('span', {}, [ state ]),
			E('small', {}, [ node.online ? _('%d Wi-Fi · %d Ethernet').format(node.wifi_count || 0, node.ethernet_count || 0) : (node.error || '—') ]),
			node.last_success ? E('small', {}, [ _('Dernière collecte : %s').format(formatDate(node.last_success)) ]) : ''
		]);
	}));
}

function summaryCards(data) {
	const s = data.summary || {};
	return E('div', { 'class': 'otb-summary-grid' }, [
		[ _('Clients Wi-Fi'), s.wifi || 0 ],
		[ _('Clients Ethernet'), s.ethernet || 0 ],
		[ _('Nœuds en ligne'), '%s/%s'.format(s.nodes_online || 0, s.nodes_total || 0) ],
		[ _('Liens dégradés'), s.degraded || 0 ],
		[ _('Liens critiques'), s.critical || 0 ]
	].map(item => E('div', { 'class': 'otb-summary-card' }, [
		E('strong', {}, [ String(item[1]) ]),
		E('span', {}, [ item[0] ])
	])));
}

function wifiRow(client, history) {
	return E('tr', { 'class': 'tr otb-clickable', 'click': () => showDetails(client, history) }, [
		E('td', { 'class': 'td' }, [ identityCell(client) ]),
		E('td', { 'class': 'td' }, [ E('strong', {}, [ client.node_label || '—' ]), E('small', { 'class': 'otb-block' }, [ client.interface || '—' ]) ]),
		E('td', { 'class': 'td' }, [ bandLabel(client.band), E('small', { 'class': 'otb-block' }, [ client.radio || '—' ]) ]),
		E('td', { 'class': 'td' }, [ client.ssid || '—', E('small', { 'class': 'otb-block' }, [ 'VLAN ' + valueOrDash(client.vlan) ]) ]),
		E('td', { 'class': 'td' }, [ valueOrDash(client.signal_dbm, ' dBm'), E('small', { 'class': 'otb-block' }, [ 'SNR ' + valueOrDash(client.snr_db, ' dB') ]) ]),
		E('td', { 'class': 'td' }, [ 'TX ' + formatRate(client.tx_mbps), E('small', { 'class': 'otb-block' }, [ 'RX ' + formatRate(client.rx_mbps) ]) ]),
		E('td', { 'class': 'td' }, [ client.standard || '—', E('small', { 'class': 'otb-block' }, [ '%s · %s'.format(valueOrDash(client.width_mhz, ' MHz'), mimoLabel(client)) ]) ]),
		E('td', { 'class': 'td' }, [ formatDuration(client.connected_seconds), E('small', { 'class': 'otb-block' }, [ client.retry_pct == null ? _('Retries : en attente') : _('Retries : %s %%').format(formatNumber(client.retry_pct, 1)) ]) ]),
		E('td', { 'class': 'td' }, [ roamingCell(client) ]),
		E('td', { 'class': 'td otb-link-cell' }, [ linkCell(client) ])
	]);
}

function ethernetRow(client, history) {
	return E('tr', { 'class': 'tr otb-clickable', 'click': () => showDetails(client, history) }, [
		E('td', { 'class': 'td' }, [ identityCell(client) ]),
		E('td', { 'class': 'td' }, [ E('strong', {}, [ client.node_label || '—' ]), E('small', { 'class': 'otb-block' }, [ client.port || '—' ]) ]),
		E('td', { 'class': 'td' }, [ _('Câblé') ]),
		E('td', { 'class': 'td' }, [ 'VLAN ' + valueOrDash(client.vlan) ]),
		E('td', { 'class': 'td' }, [ client.carrier ? _('Lien actif') : _('Lien coupé') ]),
		E('td', { 'class': 'td' }, [ formatSpeed(client.speed_mbps) ]),
		E('td', { 'class': 'td' }, [ client.duplex || '—', E('small', { 'class': 'otb-block' }, [ _('maximum %s').format(formatSpeed(client.max_speed_mbps)) ]) ]),
		E('td', { 'class': 'td' }, [ '—' ]),
		E('td', { 'class': 'td' }, [ '—' ]),
		E('td', { 'class': 'td otb-link-cell' }, [ linkCell(client) ])
	]);
}

function clientsTable(data) {
	const wifi = (data.wifi || []).slice().sort((a, b) => (a.severity || '').localeCompare(b.severity || '') || (a.hostname || a.mac || '').localeCompare(b.hostname || b.mac || ''));
	const ethernet = (data.ethernet || []).slice().sort((a, b) => (a.hostname || a.mac || '').localeCompare(b.hostname || b.mac || ''));
	const rows = wifi.map(client => wifiRow(client, data.history)).concat(ethernet.map(client => ethernetRow(client, data.history)));

	if (!rows.length)
		rows.push(E('tr', { 'class': 'tr placeholder' }, [ E('td', { 'class': 'td', 'colspan': 10 }, [ E('em', {}, [ _('Aucun client détecté.') ]) ]) ]));

	return E('div', { 'class': 'table cbi-section-table otb-table-wrap' }, [
		E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, [ _('Client') ]),
				E('th', { 'class': 'th' }, [ _('Point d’accès') ]),
				E('th', { 'class': 'th' }, [ _('Radio') ]),
				E('th', { 'class': 'th' }, [ _('SSID / VLAN') ]),
				E('th', { 'class': 'th' }, [ _('Signal / SNR') ]),
				E('th', { 'class': 'th' }, [ _('TX / RX PHY') ]),
				E('th', { 'class': 'th' }, [ _('Standard / largeur / MIMO') ]),
				E('th', { 'class': 'th' }, [ _('Connexion / retries') ]),
				E('th', { 'class': 'th' }, [ _('Roaming') ]),
				E('th', { 'class': 'th' }, [ _('Lien') ])
			]),
			...rows
		])
	]);
}

function pageContent(data) {
	const now = Date.now() / 1000;
	const stale = !data.collected_at || now - Number(data.collected_at) > Number(data.stale_after || 45);
	const blocks = [];

	blocks.push(E('h2', {}, [ _('Clients OTB') ]));
	blocks.push(E('div', { 'class': 'cbi-map-descr' }, [
		_('Vue en lecture seule des liens Wi-Fi et Ethernet. Le score combine signal, SNR, largeur, débits PHY, asymétrie, retransmissions et politiques propres aux appareils.')
	]));

	if (data.error)
		blocks.push(E('div', { 'class': 'alert-message error' }, [ data.error ]));
	if (stale)
		blocks.push(E('div', { 'class': 'alert-message warning' }, [ _('Les données sont absentes ou périmées. Le réseau continue de fonctionner indépendamment du collecteur.') ]));

	blocks.push(summaryCards(data));
	blocks.push(E('h3', {}, [ _('État des nœuds') ]));
	blocks.push(nodeCards(data.nodes));
	blocks.push(E('div', { 'class': 'otb-updated' }, [ _('Dernière collecte : %s').format(formatDate(data.collected_at)) ]));
	blocks.push(E('h3', {}, [ _('Clients détectés') ]));
	blocks.push(clientsTable(data));
	blocks.push(E('p', { 'class': 'cbi-map-descr' }, [ _('Cliquez sur une ligne pour afficher les valeurs brutes et l’historique de roaming.') ]));

	return E([], blocks);
}

const style = `
.otb-summary-grid,.otb-node-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:.75rem;margin:1rem 0}
.otb-summary-card,.otb-node-card{border:1px solid rgba(127,127,127,.28);border-radius:.6rem;padding:.8rem;background:rgba(127,127,127,.06);display:flex;flex-direction:column;gap:.2rem}
.otb-summary-card strong{font-size:1.55rem}.otb-node-card.online{border-left:5px solid #2d8a34}.otb-node-card.offline{border-left:5px solid #b42318}.otb-node-card.disabled{border-left:5px solid #777;opacity:.8}
.otb-state{display:inline-flex;align-items:center;gap:.4rem;border-radius:999px;padding:.18rem .55rem;width:max-content}.otb-dot{width:.65rem;height:.65rem;border-radius:50%;background:currentColor}
.otb-state-excellent{color:#087a36;background:rgba(8,122,54,.12)}.otb-state-good{color:#2d8a34;background:rgba(45,138,52,.12)}.otb-state-degraded{color:#b36200;background:rgba(199,118,0,.14)}.otb-state-critical{color:#b42318;background:rgba(180,35,24,.13)}.otb-state-stale,.otb-state-unknown{color:#666;background:rgba(100,100,100,.12)}
.otb-client-id,.otb-link-summary{display:flex;flex-direction:column;gap:.15rem}.otb-client-id small{font-family:monospace;white-space:nowrap}.otb-reasons{color:#a04e00;max-width:26rem}.otb-reasons.ok{color:#2d8a34}.otb-block{display:block}.otb-clickable{cursor:pointer}.otb-clickable:hover{background:rgba(80,130,200,.09)}
.otb-table-wrap{overflow-x:auto}.otb-table-wrap table{min-width:1500px}.otb-table-wrap td{vertical-align:top}.otb-link-cell{min-width:230px}.otb-updated{text-align:right;opacity:.8;margin:.4rem 0}.otb-json{max-height:340px;overflow:auto;white-space:pre-wrap}.otb-history{max-height:220px;overflow:auto}.otb-details{margin-top:.8rem}
`;

return view.extend({
	load() {
		return callGetStatus();
	},

	render(data) {
		const root = E('div', { 'class': 'otb-clients-root' });
		dom.content(root, [ E('style', {}, [ style ]), pageContent(data || {}) ]);

		poll.add(() => callGetStatus().then(status => {
			dom.content(root, [ E('style', {}, [ style ]), pageContent(status || {}) ]);
		}), 5);

		return root;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
