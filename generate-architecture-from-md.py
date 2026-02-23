"""
Flo Family Calendar - Architecture Diagram Generator
Generates comprehensive PNG architecture diagram from ARCHITECTURE_OUTPUT.md
"""

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for PNG generation
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

# Ensure output directory exists
os.makedirs('generated-diagrams-v2', exist_ok=True)

# Color scheme
COLOR_CLIENT = '#E8F4F8'
COLOR_API = '#B3E5FC'
COLOR_SERVICES = '#81D4FA'
COLOR_BEDROCK = '#4FC3F7'
COLOR_DATA = '#29B6F6'
COLOR_AWS = '#0288D1'
COLOR_BORDER = '#01579B'

def draw_box(ax, x, y, width, height, text, color, fontsize=9, fontweight='normal'):
    """Draw a rounded rectangle box with text"""
    box = FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.1", 
                         edgecolor=COLOR_BORDER, facecolor=color, linewidth=2)
    ax.add_patch(box)
    ax.text(x + width/2, y + height/2, text, ha='center', va='center', 
            fontsize=fontsize, fontweight=fontweight, wrap=True)

def draw_arrow(ax, x1, y1, x2, y2, label='', color=COLOR_BORDER):
    """Draw an arrow between two points"""
    arrow = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle='->', 
                           mutation_scale=20, linewidth=2, color=color)
    ax.add_patch(arrow)
    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x + 1, mid_y, label, fontsize=8, style='italic')

print("Generating architecture diagram from ARCHITECTURE_OUTPUT.md...")

# Create figure
fig, ax = plt.subplots(1, 1, figsize=(20, 26))
ax.set_xlim(0, 100)
ax.set_ylim(0, 130)
ax.axis('off')

# Title
ax.text(50, 127, 'Flo Family Calendar - Complete Architecture', 
        ha='center', fontsize=20, fontweight='bold')
ax.text(50, 124, '85% Complete - Production-Ready MVP', 
        ha='center', fontsize=13, style='italic', color='#666')

# ============================================================================
# LAYER 1: CLIENT LAYER (Browser)
# ============================================================================
y_pos = 118
ax.text(2, y_pos, 'LAYER 1: CLIENT (Browser)', fontsize=12, fontweight='bold', 
        bbox=dict(boxstyle='round', facecolor='#FFF9C4', alpha=0.8))

draw_box(ax, 5, y_pos-8, 90, 7, 'React 18 PWA Application\n(Vite + TypeScript)', 
         COLOR_CLIENT, 11, 'bold')

# Client components
draw_box(ax, 6, y_pos-15, 21, 6, 'Pages\n• Landing\n• Login\n• Onboarding\n• Dashboard', 
         COLOR_CLIENT, 8)
draw_box(ax, 29, y_pos-15, 21, 6, 'Components (15+)\n• Calendar Grid\n• Dashboard\n• Modals\n• Charts', 
         COLOR_CLIENT, 8)
draw_box(ax, 52, y_pos-15, 21, 6, 'Services\n• WebSocket\n• Cache\n• Offline Sync\n• Notifications', 
         COLOR_CLIENT, 8)
draw_box(ax, 75, y_pos-15, 19, 6, 'Design System\n• Colors\n• Typography\n• Spacing\n• Responsive', 
         COLOR_CLIENT, 8)

# Arrow from client to API
draw_arrow(ax, 50, y_pos-15, 50, y_pos-20, 'HTTP/REST API')

# ============================================================================
# LAYER 2: API GATEWAY & ROUTING
# ============================================================================
y_pos = 95
ax.text(2, y_pos, 'LAYER 2: API GATEWAY', fontsize=12, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#C8E6C9', alpha=0.8))

draw_box(ax, 5, y_pos-7, 90, 6, 'Express.js API Server (Node.js)\nPort 3000 / AWS Lambda', 
         COLOR_API, 11, 'bold')

# API routes
draw_box(ax, 6, y_pos-14, 21, 6, 'Auth Routes\n• /register\n• /login\n• /logout', 
         COLOR_API, 8)
draw_box(ax, 29, y_pos-14, 21, 6, 'Event Routes\n• CRUD events\n• /categories\n• /allocation', 
         COLOR_API, 8)
draw_box(ax, 52, y_pos-14, 21, 6, 'Dashboard Routes\n• /metrics\n• /thresholds\n• /suggestions', 
         COLOR_API, 8)
draw_box(ax, 75, y_pos-14, 19, 6, 'New Routes ⚠️\n• /conflicts\n• /preferences\n• /sync', 
         COLOR_API, 8)

# Arrow from API to Services
draw_arrow(ax, 50, y_pos-14, 50, y_pos-19, 'Service Calls')

# ============================================================================
# LAYER 3: BUSINESS LOGIC SERVICES
# ============================================================================
y_pos = 70
ax.text(2, y_pos, 'LAYER 3: BUSINESS LOGIC (33 Services)', fontsize=12, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#FFCCBC', alpha=0.8))

# Row 1 of services
draw_box(ax, 6, y_pos-7, 17, 6, 'Auth & Access\n• auth-service\n• session-manager\n• password-mgr', 
         COLOR_SERVICES, 8)
draw_box(ax, 25, y_pos-7, 17, 6, 'Event Mgmt\n• event-service\n• classifier\n• extracurricular', 
         COLOR_SERVICES, 8)
draw_box(ax, 44, y_pos-7, 17, 6, 'Time Tracking\n• dashboard-builder\n• metrics-calc\n• aggregator', 
         COLOR_SERVICES, 8)
draw_box(ax, 63, y_pos-7, 15, 6, 'Notifications\n• dispatcher\n• builder\n• preferences', 
         COLOR_SERVICES, 8)
draw_box(ax, 80, y_pos-7, 14, 6, 'Conflicts\n• detector\n• resolver\n• applier', 
         COLOR_SERVICES, 8)

# Row 2 of services
draw_box(ax, 6, y_pos-15, 17, 6, 'Summaries\n• generator\n• scheduler\n• event-triggered', 
         COLOR_SERVICES, 8)
draw_box(ax, 25, y_pos-15, 17, 6, 'Thresholds\n• threshold-svc\n• monitor\n• alerts', 
         COLOR_SERVICES, 8)
draw_box(ax, 44, y_pos-15, 17, 6, 'Calendar Src\n• registry\n• integration\n• sync', 
         COLOR_SERVICES, 8)
draw_box(ax, 63, y_pos-15, 15, 6, 'Data Mgmt\n• backup-mgr\n• recovery\n• retention', 
         COLOR_SERVICES, 8)
draw_box(ax, 80, y_pos-15, 14, 6, 'Onboarding\n• setup-svc\n• preferences\n• validation', 
         COLOR_SERVICES, 8)

# Arrow from Services to Bedrock
draw_arrow(ax, 50, y_pos-15, 50, y_pos-20, 'AI Agent Calls')

# ============================================================================
# LAYER 4: AWS BEDROCK AGENT LAYER
# ============================================================================
y_pos = 44
ax.text(2, y_pos, 'LAYER 4: AWS BEDROCK AGENTS (30+ Files)', fontsize=12, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#F8BBD0', alpha=0.8))

# Row 1 of Bedrock components
draw_box(ax, 6, y_pos-7, 21, 6, 'Core Components\n• lambda-handler\n• bedrock-invoker\n• agent-registry', 
         COLOR_BEDROCK, 8)
draw_box(ax, 29, y_pos-7, 21, 6, '10 Agent Types\n• Weather\n• Calendar Query\n• Classifier', 
         COLOR_BEDROCK, 8)
draw_box(ax, 52, y_pos-7, 21, 6, 'Tool Functions\n• calendar-tool\n• weather-tool\n• parser-tool', 
         COLOR_BEDROCK, 8)
draw_box(ax, 75, y_pos-7, 19, 6, 'Error Handling\n• error-handler\n• retry-logic\n• fallback-mgr', 
         COLOR_BEDROCK, 8)

# Row 2 of Bedrock components
draw_box(ax, 6, y_pos-15, 21, 6, 'Data Persistence\n• execution-persist\n• retrieval\n• schema', 
         COLOR_BEDROCK, 8)
draw_box(ax, 29, y_pos-15, 21, 6, 'Configuration\n• config-loader\n• validator\n• updater', 
         COLOR_BEDROCK, 8)
draw_box(ax, 52, y_pos-15, 21, 6, 'Monitoring\n• metrics-publisher\n• cloudwatch-alarms\n• logger', 
         COLOR_BEDROCK, 8)
draw_box(ax, 75, y_pos-15, 19, 6, 'Event Publishing\n• sns-publisher\n• event-builder\n• validation', 
         COLOR_BEDROCK, 8)

# Arrow from Bedrock to Data Access
draw_arrow(ax, 50, y_pos-15, 50, y_pos-20, 'Data Operations')

# ============================================================================
# LAYER 5: DATA ACCESS LAYER
# ============================================================================
y_pos = 18
ax.text(2, y_pos, 'LAYER 5: DATA ACCESS', fontsize=12, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#E1BEE7', alpha=0.8))

draw_box(ax, 6, y_pos-7, 88, 6, 
         'DynamoDB Client Wrapper\n• dynamodb-client.ts (CRUD) • dynamodb-with-cache.ts (caching)\n' +
         'Features: Single-table design • Query optimization • Connection pooling • Error handling', 
         COLOR_DATA, 9)

# Arrow from Data Access to AWS Services
draw_arrow(ax, 50, y_pos-7, 50, y_pos-12, 'AWS SDK')

# ============================================================================
# LAYER 6: AWS SERVICES
# ============================================================================
y_pos = 4
ax.text(2, y_pos+1, 'LAYER 6: AWS SERVICES', fontsize=12, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#B2DFDB', alpha=0.8))

# AWS Services
draw_box(ax, 6, y_pos-6, 13, 5, 'DynamoDB\nData Store', COLOR_AWS, 9, 'bold')
draw_box(ax, 21, y_pos-6, 13, 5, 'Bedrock\nAI Agents', COLOR_AWS, 9, 'bold')
draw_box(ax, 36, y_pos-6, 13, 5, 'Lambda\nCompute', COLOR_AWS, 9, 'bold')
draw_box(ax, 51, y_pos-6, 13, 5, 'SNS\nMessaging', COLOR_AWS, 9, 'bold')
draw_box(ax, 66, y_pos-6, 13, 5, 'CloudWatch\nMonitoring', COLOR_AWS, 9, 'bold')
draw_box(ax, 81, y_pos-6, 13, 5, 'IAM/Secrets\nSecurity', COLOR_AWS, 9, 'bold')

# ============================================================================
# LEGEND
# ============================================================================
legend_y = 122
ax.text(2, legend_y-2, 'Status Legend:', fontsize=10, fontweight='bold')
ax.text(2, legend_y-4, '✅ Fully Implemented (20 features)', fontsize=9, color='green')
ax.text(2, legend_y-6, '⚠️  Partially Implemented (5 features)', fontsize=9, color='orange')
ax.text(2, legend_y-8, '❌ Not Implemented (4 features)', fontsize=9, color='red')

# Save the diagram
output_path = 'generated-diagrams-v2/flo-architecture-complete.png'
plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
print(f"✅ Architecture diagram saved to: {output_path}")

# Also save a high-res version
output_path_hires = 'generated-diagrams-v2/flo-architecture-complete-hires.png'
plt.savefig(output_path_hires, dpi=600, bbox_inches='tight', facecolor='white')
print(f"✅ High-res diagram saved to: {output_path_hires}")

plt.close()

print("\n✅ Architecture diagrams generated successfully!")
print(f"   - Standard: generated-diagrams-v2/flo-architecture-complete.png (300 DPI)")
print(f"   - High-res: generated-diagrams-v2/flo-architecture-complete-hires.png (600 DPI)")
