const SYMBOLS_TO_CACHE = ["AAPL"];

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type"
				}
			})
		}

		const url = new URL(request.url);
		const symbol = url.searchParams.get("symbol");
		const endpoint = url.searchParams.get("endpoint") || "quote";
		const source = url.searchParams.get("source");

		if (!symbol) {
			return jsonError("Missing symbol param", 400);
		}

		if (source === "chart") {
			return await getChartFromKV(symbol, env);
		}

		const allowedEndpoints = ["quote", "profile2", "metric"];

		if (!allowedEndpoints.includes(endpoint)) {
			return jsonError("Invalid endpoint", 400);
		}
		
		let finnhubUrl = `https://finnhub.io/api/v1/${endpoint}?symbol=${symbol}&token=${env.FINNHUB_API_KEY}`;
		if (endpoint === "metric") {
			finnhubUrl += "&metric=all";
		}
	const hasKey = !!env.FINNHUB_API_KEY;
const keyLength = env.FINNHUB_API_KEY ? env.FINNHUB_API_KEY.length : 0;

return new Response(JSON.stringify({
  urlUsed: finnhubUrl.replace(env.FINNHUB_API_KEY || "undefined", "REDACTED"),
  hasKey,
  keyLength
}), {
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
});
try {
  const response = await fetch(finnhubUrl);
  const rawText = await response.text();

  return new Response(JSON.stringify({ status: response.status, body: rawText }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
} catch (err) {
  return jsonError(`Upstream fetch failed: ${err.message}`, 502);
}
	},

	async scheduled(event, env, ctx) {
		for (const symbol of SYMBOLS_TO_CACHE) {
			await refreshChartCache(symbol, env);
		}
	}
};

async function getChartFromKV(symbol, env) {
	const cached = await env.CHART_CACHE.get(symbol.toUpperCase());

	if (!cached) {
		return await refreshChartCache(symbol, env, true);
	}

	return new Response(cached, {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=3600"
		}
	})
}

async function refreshChartCache(symbol, env, returnResponse = false) {
	const tdUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=100&apikey=${env.TWELVE_DATA_API_KEY}`;

	try {
		const response = await fetch(tdUrl);
		const data = await response.json();
		
		if (data.status !== "ok" || !data.values) {
			if (returnResponse) {
				return jsonError(data.message || "No data returned from Twelve Data", 502);
			}
			return;
		}

		const parsed = data.values.map((v) => ({
		date: v.datetime,
		open: parseFloat(v.open),
		high: parseFloat(v.high),
		low: parseFloat(v.low),
		close: parseFloat(v.close),
		volume: parseInt(v.volume, 10)
		}));

		parsed.reverse();

		const jsonString = JSON.stringify(parsed);

		await env.CHART_CACHE.put(symbol.toUpperCase(), jsonString);

		if (returnResponse) {
		return new Response(jsonString, {
			headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=3600"
			}
		});
		}
	} catch (err) {
		if (returnResponse) {
			return jsonError("Twelve Data fetch failed", 502);
		}
	}
}

function jsonError(message, status) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*"
		}
	})
}