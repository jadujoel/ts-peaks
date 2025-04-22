import home from "./src/index.html"
import { build } from "./build"

export async function serve(): Promise<void> {
  await build()
  const server = Bun.serve({
    static: {
      "/": home
    },
    fetch(request, server) {
      if (request.method === "GET") {
        const url = new URL(request.url)
        const name = url.pathname
        const path = `public${name}`
        console.log("[request]", name)
        return new Response(Bun.file(path))
      }
    },
    websocket: {
      message() {}
    }
  })
  console.log(server.url.href)
}

if (import.meta.main) {
  await serve()
}
