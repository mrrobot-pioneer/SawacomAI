import re
from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def first_paragraph(value):
    """
    Return the first <p>...</p> (with any inner tags intact),
    or an empty string if none found.
    """
    match = re.search(r'(<p.*?>.*?</p>)', value, re.S | re.I)
    if match:
        return mark_safe(match.group(1))
    return ''
