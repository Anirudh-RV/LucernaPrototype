from django.urls import path
from . import views
from decorators import auth_required

urlpatterns = [
    path('table-definitions/', auth_required(views.TableDefinitionListCreateView.as_view()), name='table-definition-list-create'),
    path('table-definitions/<uuid:pk>/', auth_required(views.TableDefinitionDetailView.as_view()), name='table-definition-detail'),
    path('table-definitions/<uuid:pk>/create-table/', auth_required(views.CreateTableView.as_view()), name='create-table'),
    path('table-definitions/<uuid:pk>/drop-table/', auth_required(views.DropTableView.as_view()), name='drop-table'),
    path('table-definitions/<uuid:pk>/rows/', auth_required(views.TableRowsView.as_view()), name='table-rows'),
    path('columns/', auth_required(views.ColumnDefinitionCreateView.as_view()), name='column-definition-create'),
    path('columns/<uuid:pk>/', auth_required(views.ColumnDefinitionDetailView.as_view()), name='column-definition-detail'),
    path('columns/<uuid:pk>/apply/', auth_required(views.ApplyColumnView.as_view()), name='apply-column'),
    path('column-types/', auth_required(views.ColumnTypeChoicesView.as_view()), name='column-type-choices'),
    path('table-definitions/<uuid:pk>/rows/<str:row_id>/', auth_required(views.TableRowDetailView.as_view()), name='table-row-detail'),
    path('columns/', auth_required(views.ColumnDefinitionCreateView.as_view()), name='column-definition-create'),
    path('columns/<uuid:pk>/', auth_required(views.ColumnDefinitionDetailView.as_view()), name='column-definition-detail'),
    path('columns/<uuid:pk>/apply/', auth_required(views.ApplyColumnView.as_view()), name='apply-column'),
    path('column-types/', auth_required(views.ColumnTypeChoicesView.as_view()), name='column-type-choices'),
]