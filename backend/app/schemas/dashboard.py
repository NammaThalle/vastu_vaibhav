from datetime import datetime
from typing import List
from pydantic import BaseModel


class DashboardActivityItem(BaseModel):
    id: str
    title: str
    subtitle: str
    when: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_clients: int
    new_clients_trend: str
    total_visits: int
    new_visits_trend: str
    collected_this_period: float
    goal_for_period: float
    goal_completion: float
    pending_balance: float
    overdue_balance: float
    total_revenue: float
    recent_activity: List[DashboardActivityItem]
