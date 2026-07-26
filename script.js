const WORKER_URL = "https://ticklit-proxy.sodanhama.workers.dev";

const TERM_DEFINITIONS = {
    peRatio: {
        label: "P/E Ratio",
        explain: ""
    }
}

async function initChart() {
    const container = document.getElementById("chart-container");

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: {
            background: {color: '#0a0908'},
            textColor: '#f2f4f3',
        },
        grid: {
            vertLines: {color: '#1e222d'},
            horzLines: {color: '#1e222d'},
        },
        rightPriceScale: {
            borderColor: '#2a2e39',
        },
        timeScale: {
            borderColor: '#2a2e39',
        },
    })

    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
    color: '#26a69a',
    lineWidth: 2,
    });

    const response = await fetch(`${WORKER_URL}/?symbol=AAPL&source=chart`);
    const data = await response.json();

    const chartData = data.map((day)=> ({
        time: day.date,
        value: day.close,
    }))

    lineSeries.setData(chartData);
}

initChart();