from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Monta static para CSS/JS
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Index
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "templates", "index.html"))

# Registro
@app.get("/register")
def serve_register():
    return FileResponse(os.path.join(BASE_DIR, "templates", "register.html"))
