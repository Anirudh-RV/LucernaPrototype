import os
import django
import sys

# Configure django
sys.path.append(os.path.abspath('backend/lucerna'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lucerna.settings')
django.setup()

from contracts.models import Stakeholder, StakeholderContractAccess, TableDefinition

stakeholder = Stakeholder.objects.first()
if not stakeholder:
    print("No stakeholders found.")
    sys.exit(0)

print(f"Stakeholder: {stakeholder.phone} - {stakeholder.name}")
access = StakeholderContractAccess.objects.filter(stakeholder=stakeholder).first()
if access:
    print(f"Access details: Email={access.email}, Role={access.role}")
else:
    print("No access rules found.")
