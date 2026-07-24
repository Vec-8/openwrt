'use strict';
'require baseclass';

function httpJson(path) {
	return new Promise(function(resolve) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', path + '?_=' + Date.now(), true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				try { resolve(JSON.parse(xhr.responseText || '{}')); }
				catch(e) { resolve({}); }
			}
		};
		xhr.onerror = function() { resolve({}); };
		xhr.send();
	});
}
function fmtTime(s) {
	var n = +s || 0, h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), sec = n % 60;
	return h + 'h ' + m + 'm ' + sec + 's';
}
function badge(status, online) {
	var ok = online || status == 'online';
	var color = ok ? '#2e7d32' : '#c62828';
	var text = status == 'online' ? 'En ligne' : (status == 'offline' ? 'Hors ligne' : (status || 'Inconnu'));
	return E('span', { 'style': 'display:inline-block;border-radius:4px;padding:2px 8px;color:#fff;background:' + color + ';font-weight:600' }, [ text ]);
}
function restartWan(iface, btn) {
	btn.disabled = true;
	btn.textContent = 'Redémarrage…';
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/cgi-bin/otb-wan-restart?iface=' + encodeURIComponent(iface) + '&_=' + Date.now(), true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			btn.disabled = false;
			btn.textContent = 'Redémarrer';
			window.setTimeout(function(){ window.location.reload(); }, 1200);
		}
	};
	xhr.onerror = function() { btn.disabled = false; btn.textContent = 'Redémarrer'; };
	xhr.send();
}

function deleteDevice(ip, btn) {
	if (!confirm('Supprimer ' + ip + ' de la supervision ?')) return;
	btn.disabled = true;
	btn.textContent = 'Suppression…';
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/cgi-bin/otb-device-del?ip=' + encodeURIComponent(ip) + '&_=' + Date.now(), true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			btn.disabled = false;
			btn.textContent = 'Supprimer';
			var r = {};
			try { r = JSON.parse(xhr.responseText || '{}'); } catch(e) {}
			if (!r.ok) { alert(r.error || 'Suppression impossible'); return; }
			window.location.reload();
		}
	};
	xhr.onerror = function() { btn.disabled = false; btn.textContent = 'Supprimer'; alert('Erreur réseau'); };
	xhr.send();
}
function saveFormValue(id) {
	var el = document.getElementById(id);
	if (el) localStorage.setItem('otb-supervision-' + id, el.value || '');
}
function restoreFormValue(id) {
	var el = document.getElementById(id);
	if (el) el.value = localStorage.getItem('otb-supervision-' + id) || '';
}
function clearFormValues() {
	['otb-dev-name', 'otb-dev-role', 'otb-dev-ip'].forEach(function(id) { localStorage.removeItem('otb-supervision-' + id); });
}
function addDevice(btn) {
	['otb-dev-name', 'otb-dev-role', 'otb-dev-ip'].forEach(saveFormValue);
	var name = document.getElementById('otb-dev-name').value || '';
	var role = document.getElementById('otb-dev-role').value || '';
	var ip = document.getElementById('otb-dev-ip').value || '';
	if (!ip) { alert('IP obligatoire'); return; }
	btn.disabled = true;
	btn.textContent = 'Ajout…';
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/cgi-bin/otb-device-add?name=' + encodeURIComponent(name) + '&role=' + encodeURIComponent(role) + '&ip=' + encodeURIComponent(ip) + '&_=' + Date.now(), true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			btn.disabled = false;
			btn.textContent = 'Ajouter';
			var r = {};
			try { r = JSON.parse(xhr.responseText || '{}'); } catch(e) {}
			if (!r.ok) { alert(r.error || 'Ajout impossible'); return; }
			clearFormValues();
			window.location.reload();
		}
	};
	xhr.onerror = function() { btn.disabled = false; btn.textContent = 'Ajouter'; alert('Erreur réseau'); };
	xhr.send();
}


return baseclass.extend({
	title: _('OTB - WAN et supervision'),
	load: function() { return httpJson('/cgi-bin/otb-status-json'); },
	render: function(data) {
		data = data || {};
		var wanRows = (data.wans || []).map(function(w) {
			return E('tr', [
				E('td', [ E('strong', [ w.label || w.name ]), E('br'), E('small', [ w.name || '-' ]) ]),
				E('td', [ badge(w.status, w.status == 'online') ]),
				E('td', [ fmtTime(w.uptime) ]),
				E('td', [ w.device || '-' ]),
				E('td', [ w.ip || '-' ]),
				E('td', [ E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': function(ev) { restartWan(w.name, ev.currentTarget); } }, [ 'Redémarrer' ]) ])
			]);
		});
		var devRows = (data.devices || []).map(function(d) {
			return E('tr', [
				E('td', [ E('strong', [ d.name || '-' ]), E('br'), E('small', [ d.role || '-' ]) ]),
				E('td', [ badge(d.status, d.online) ]),
				E('td', [ d.ip || '-' ]),
				E('td', [
					E('a', { 'href': d.http_url || ('http://' + d.ip + '/'), 'target': '_blank', 'rel': 'noopener' }, [ 'HTTP' ]),
					' / ',
					E('a', { 'href': d.https_url || ('https://' + d.ip + '/'), 'target': '_blank', 'rel': 'noopener' }, [ 'HTTPS' ])
				]),
				E('td', [ E('button', { 'class': 'btn cbi-button cbi-button-remove', 'click': function(ev) { deleteDevice(d.ip, ev.currentTarget); } }, [ 'Supprimer' ]) ])
			]);
		});
		var devTable = E('table', { 'class': 'table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', ['Équipement']), E('th', ['État']), E('th', ['IP']), E('th', ['Page']), E('th', ['Action']) ]) ].concat(devRows.length ? devRows : [ E('tr', [ E('td', { 'colspan': '5' }, [ 'Aucune donnée supervision lue.' ]) ]) ]));
		var addForm = E('div', { 'class': 'cbi-section-node', 'style': 'margin-top:1em' }, [
			E('h5', { 'style': 'margin:0 0 .6em 0' }, [ 'Ajouter un équipement' ]),
			E('input', { 'id': 'otb-dev-name', 'class': 'cbi-input-text', 'placeholder': 'Nom', 'style': 'max-width:13em;margin-right:.4em', 'input': function() { saveFormValue('otb-dev-name'); } }),
			E('input', { 'id': 'otb-dev-role', 'class': 'cbi-input-text', 'placeholder': 'Rôle', 'style': 'max-width:11em;margin-right:.4em', 'input': function() { saveFormValue('otb-dev-role'); } }),
			E('input', { 'id': 'otb-dev-ip', 'class': 'cbi-input-text', 'placeholder': 'IP', 'style': 'max-width:10em;margin-right:.4em', 'input': function() { saveFormValue('otb-dev-ip'); } }),
			E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': function(ev) { addDevice(ev.currentTarget); } }, [ 'Ajouter' ])
		]);
		window.setTimeout(function() { restoreFormValue('otb-dev-name'); restoreFormValue('otb-dev-role'); restoreFormValue('otb-dev-ip'); }, 0);
		return E('div', { 'class': 'cbi-section' }, [
			E('h4', [ 'Gestionnaire MultiWAN' ]),
			E('table', { 'class': 'table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', ['Interface']), E('th', ['État']), E('th', ['Fonctionnement']), E('th', ['Appareil']), E('th', ['IP']), E('th', ['Action']) ]) ].concat(wanRows.length ? wanRows : [ E('tr', [ E('td', { 'colspan': '6' }, [ 'Aucune donnée WAN lue.' ]) ]) ])),
			E('h4', { 'style': 'margin-top:1.5em' }, [ 'Supervision équipements' ]),
			devTable,
			addForm
		]);
	}
});
