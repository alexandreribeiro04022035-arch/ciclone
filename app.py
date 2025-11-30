from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Monta a pasta static para CSS e JS
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve index.html da pasta templates
@app.get("/")
def serve_index():
    return FileResponse("templates/index.html")

# Serve register.html da pasta templates
@app.get("/register")
def serve_register():
    return FileResponse("templates/register.html")
