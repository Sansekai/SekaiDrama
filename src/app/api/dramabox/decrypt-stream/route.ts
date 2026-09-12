import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/dramabox";

export const dynamic = 'force-dynamic';

// Custom agent to ignore SSL issues
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Helper: Fetch stream with redirect handling
function fetchStream(url: string, headers: Record<string, string>, redirectCount = 5): Promise<{ res: http.IncomingMessage; url: string }> {
  return new Promise((resolve, reject) => {
    if (redirectCount <= 0) return reject(new Error("Too many redirects"));

    const isHttp = url.startsWith("http:");
    const requestModule = isHttp ? http : https;

    const options = {
      headers: headers,
      agent: isHttp ? undefined : agent,
      rejectUnauthorized: false,
      method: 'GET'
    };

    const req = requestModule.request(url, options, (res) => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const newUrl = new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetchStream(newUrl, headers, redirectCount - 1));
      }
      resolve({ res, url });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

// Convert Node stream to Web ReadableStream
function nodeToWebStream(nodeStream: http.IncomingMessage): ReadableStream {
  let isClosed = false;

  return new ReadableStream({
    start(controller) {
      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          try { controller.close(); } catch (e) { /* ignore */ }
        }
      };

      const safeError = (err: Error) => {
        if (!isClosed) {
          isClosed = true;
          try { controller.error(err); } catch (e) { /* ignore */ }
        }
      };

      nodeStream.on('data', (chunk) => {
        if (!isClosed) {
          try { controller.enqueue(chunk); } catch (e) {
            isClosed = true;
            nodeStream.destroy();
          }
        }
      });

      nodeStream.on('end', safeClose);
      nodeStream.on('error', safeError);
      nodeStream.on('close', safeClose);
    },
    cancel() {
      isClosed = true;
      nodeStream.destroy();
    }
  });
}

export async function GET(request: NextRequest) {
  const encryptedUrl = request.nextUrl.searchParams.get("url");

  if (!encryptedUrl) {
    return new NextResponse("Missing 'url' parameter", { status: 400 });
  }

  try {
    // Build the upstream decrypt-video URL
    const upstreamUrl = `${UPSTREAM_API}/decrypt-video?url=${encodeURIComponent(encryptedUrl)}`;

    const range = request.headers.get("range");
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
    };

    if (range) {
      headers["Range"] = range;
    }

    const { res: upstreamRes } = await fetchStream(upstreamUrl, headers);

    if ((upstreamRes.statusCode || 500) >= 400) {
      console.error(`Decrypt stream failed: ${upstreamRes.statusCode}`);
      return new NextResponse(`Upstream Error: ${upstreamRes.statusMessage}`, { status: upstreamRes.statusCode });
    }

    const stream = nodeToWebStream(upstreamRes);

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstreamRes.headers['content-type'] || "video/mp4");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Accept-Ranges", "bytes");

    if (upstreamRes.headers['content-length']) {
      responseHeaders.set("Content-Length", upstreamRes.headers['content-length']);
    }
    if (upstreamRes.headers['content-range']) {
      responseHeaders.set("Content-Range", upstreamRes.headers['content-range']);
    }

    return new NextResponse(stream as unknown as BodyInit, {
      status: upstreamRes.statusCode || 200,
      statusText: upstreamRes.statusMessage,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("Decrypt stream error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
