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
	
		try {
			const response = await fetch(finnhubUrl);
			const data = await response.json();

			return new Response(JSON.stringify(data), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"Cache-Control": "public, max-age=60"
				}
			})
			
		} catch (err) {
			return jsonError("Upstream fetch failed", 502);
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
	const avUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${env.ALPHA_VANTAGE_API_KEY}`;

	try {
		const response = await fetch(avUrl);
		const data = await response.json();
		const series = data["Time Series (Daily)"];

		if (!series) {
			if (returnResponse) {
				return jsonError(data["Note"] || data["Information"] || "No data returned from Alpha Vantage", 502);
			}
			return
		}

		const parsed = Object.entries(series).map(([date, values]) => ({
			date,
			open: parseFloat(values["1. open"]),
			high: parseFloat(values["2. high"]),
			low: parseFloat(values["3. low"]),
			close: parseFloat(values["4. close"]),
			volume: parseInt(values["5. volume"], 10)
		}))

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
			return jsonError("Alpha Vantage fetch failed", 502);
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