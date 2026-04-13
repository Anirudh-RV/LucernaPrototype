from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contracts", "0007_alter_stakeholder_phone"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="stakeholder",
            name="email",
        ),
    ]
