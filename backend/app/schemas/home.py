from datetime import date

from pydantic import BaseModel


class DueItem(BaseModel):
    property_id: str
    client_id: str
    client_name: str
    phone: str | None
    label: str
    balance: int
    last_activity: date | None


class UpcomingVisit(BaseModel):
    visit_id: str
    property_id: str
    client_name: str
    label: str
    visit_date: date
    purpose: str | None


class HomeSummary(BaseModel):
    outstanding_total: int
    collected_this_month: int
    dues: list[DueItem]
    upcoming_visits: list[UpcomingVisit]
