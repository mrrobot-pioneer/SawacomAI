from django.db import models
from django.contrib.auth.models import User
from django_ckeditor_5.fields import CKEditor5Field

class Blog(models.Model):
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('published', 'Published'),
    ]
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='blog_posts')   
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, editable=False) # SEO friendly urls, Automatically generated slug from title
    thumbnail = models.ImageField(upload_to='blog_thumbnails/')
    content = CKEditor5Field('Body', config_name='default')  
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='published',
        help_text="Set to ‘Published’ to make this post visible."
    )

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
