

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contracts", "0005_remove_stakeholder_project"),
    ]

    operations = [
        migrations.AddField(
            model_name="stakeholder",
            name="email",
            field=models.EmailField(
                blank=True,
                db_index=True,
                help_text="Unique email for stakeholder portal login and notifications.",
                max_length=254,
                null=True,
                unique=True,
            ),
        ),
    ]
