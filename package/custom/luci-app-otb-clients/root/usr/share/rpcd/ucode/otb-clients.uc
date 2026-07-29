#!/usr/bin/env ucode

'use strict';

import { readfile } from 'fs';

const STATUS_FILE = '/tmp/otb-clients/status.json';

const methods = {
	getStatus: {
		call: function() {
			let content = readfile(STATUS_FILE);
			if (content == null)
				return {
					schema: 1,
					collected_at: 0,
					nodes: [],
					wifi: [],
					ethernet: [],
					history: [],
					error: 'Le collecteur n’a encore produit aucune mesure.'
				};

			try { return json(content); }
			catch (e) {
				return {
					schema: 1,
					collected_at: 0,
					nodes: [],
					wifi: [],
					ethernet: [],
					history: [],
					error: 'Le fichier de statut est invalide.'
				};
			}
		}
	}
};

return { 'luci.otb-clients': methods };
