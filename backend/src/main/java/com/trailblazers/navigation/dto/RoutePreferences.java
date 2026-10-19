package com.trailblazers.navigation.dto;

public class RoutePreferences {
    private boolean avoidStairs = false;
    private boolean accessibleOnly = false;

    public boolean isAvoidStairs() { return avoidStairs; }
    public void setAvoidStairs(boolean avoidStairs) { this.avoidStairs = avoidStairs; }

    public boolean isAccessibleOnly() { return accessibleOnly; }
    public void setAccessibleOnly(boolean accessibleOnly) { this.accessibleOnly = accessibleOnly; }
}
