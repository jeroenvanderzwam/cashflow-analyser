from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import os

app = FastAPI()
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


@app.get('/api/years')
def list_years():
    """Return sorted list of available year strings based on data/*.csv filenames."""
    files = [f[:-4] for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    return sorted(files)


@app.get('/api/categories')
def get_categories():
    """Return user-defined merchant→category mappings, or {} if not found."""
    path = os.path.join(DATA_DIR, 'categories.json')
    if not os.path.isfile(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


@app.get('/api/data/{year}')
def get_data(year: str):
    """Return raw CSV text for the requested year."""
    path = os.path.join(DATA_DIR, f'{year}.csv')
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f'No data for year {year}')
    return FileResponse(path, media_type='text/plain; charset=utf-8')


# Serve static files — must be mounted last so API routes take priority
app.mount('/', StaticFiles(directory='dist', html=True), name='static')
