from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from .views import ProjectCreateView, ProjectListView
from decorators import user_auth_required

urlpatterns = [
    path('v1/create/', csrf_exempt(user_auth_required(ProjectCreateView.as_view())), name='project-create'),
    path('v1/list/', user_auth_required(ProjectListView.as_view())),
]