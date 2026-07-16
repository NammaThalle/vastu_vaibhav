"""Sign in to the supplier's Odoo customer portal and fetch order pages.

The password is only ever sent to the portal's sign-in form; it is never logged or stored
anywhere but the server's .env. Requests go one at a time with a short pause.
"""
import asyncio
import re

import httpx
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (compatible; order-sync/1.0)"
MAX_LIST_PAGES = 20


class SignInError(RuntimeError):
    pass


class PortalClient:
    def __init__(self, base_url: str, login: str, password: str, *, transport: httpx.AsyncBaseTransport | None = None,
                 pause: float = 1.0):
        self._login, self._password, self._pause = login, password, pause
        self._http = httpx.AsyncClient(base_url=base_url.rstrip("/"), follow_redirects=True, timeout=30,
                                       headers={"User-Agent": USER_AGENT}, transport=transport)

    async def __aenter__(self) -> "PortalClient":
        return self

    async def __aexit__(self, *exc) -> None:
        await self._http.aclose()

    async def _get(self, url: str) -> httpx.Response:
        response = await self._http.get(url)
        response.raise_for_status()
        if self._pause:
            await asyncio.sleep(self._pause)
        return response

    async def sign_in(self) -> None:
        page = await self._get("/web/login")
        token = BeautifulSoup(page.text, "html.parser").find("input", attrs={"name": "csrf_token"})
        if token is None:
            raise SignInError("The supplier's sign-in page has no form token; its layout may have changed")
        response = await self._http.post("/web/login", data={
            "login": self._login, "password": self._password, "csrf_token": token.get("value", ""),
            "redirect": "/my/orders",
        })
        if response.url.path.startswith("/web/login") or 'name="password"' in response.text:
            raise SignInError("The supplier did not accept the login. Check SUPPLIER_LOGIN and SUPPLIER_PASSWORD.")

    async def order_list_pages(self) -> list[str]:
        """The order list, following its numbered pages (/my/orders/page/2 and so on)."""
        first = await self._get("/my/orders")
        pages, seen = [first.text], {"/my/orders"}
        queue = sorted(set(re.findall(r'href="([^"]*/my/orders/page/\d+[^"]*)"', first.text)))
        while queue and len(pages) < MAX_LIST_PAGES:
            link = queue.pop(0).replace("&amp;", "&")
            if link in seen:
                continue
            seen.add(link)
            pages.append((await self._get(link)).text)
        return pages

    async def order_page(self, link: str) -> str:
        return (await self._get(link.replace("&amp;", "&"))).text
